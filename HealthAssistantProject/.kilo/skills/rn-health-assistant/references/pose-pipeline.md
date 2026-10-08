# Pose Pipeline (camera → rep → feedback)

Đây là phần khó nhất và dễ sai nhất của app. Nguyên tắc: **camera loop phải chạy offline**, không gọi LLM ở mỗi frame, và chỉ ghi nhận rep khi đủ tin cậy.

## Luồng tổng thể

```text
Camera frame
  → PoseLandmarker (MediaPipe Tasks Vision, on-device)
  → 33 landmarks {x, y, z, visibility}  (x/y/z chuẩn hoá -1..1)
  → One Euro Filter (làm mượt theo từng trục, không phẳng cả khung hình)
  → Visibility gate (>= 0.5 cho landmark bắt buộc)
  → Tính góc khớp cục bộ (cache để vẽ overlay, không gọi mạng mỗi frame)
  → FSM đếm rep cục bộ
  → Đồng bộ giảm tần số sang backend (batch theo chu kỳ, không phải mỗi frame)
  → Phát feedback: HUD + TTS có cooldown
```

## Vì sao không gọi `/pose-engine/angle` mỗi frame

Gọi mạng mỗi frame sẽ giật, tốn pin, và phụ thuộc mạng. Endpoint đó dùng cho:
- Xác nhận góc ở các mốc quan trọng (bắt đầu bài, kết thúc rep, khi nghi ngờ).
- Test hợp đồng dữ liệu khi phát triển ML thay thế luật cứng.

Tính góc phía app chỉ để hiển thị overlay tức thời, và phải ghi rõ trong comment rằng đây là bản hiển thị, số chính thức đến từ server.

## Landmark mapping

MediaPipe trả index chuẩn. Chỉ ánh xạ các điểm backend cần:

```ts
export const MP = {
  NOSE: 0,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
} as const;
```

`neck` không có index trực tiếp trong MediaPipe. Backend đòi trường `neck`, nên app phải **tính từ điểm trung bình của hai vai** và ghi rõ đó là điểm ảo. Tương tự `forwardHeadDegrees` ở backend dùng trung bình hai tai.

```ts
const mid = (a: Point3D, b: Point3D): Point3D => ({
  x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2,
  visibility: Math.min(a.visibility, b.visibility),
});
```

Điểm ảo phải đánh dấu bằng comment; nếu không, người đọc sau sẽ hiểu nhầm đó là landmark thật.

## One Euro Filter

Bộ lọc thích nghi: giảm nhiễu mạnh khi người đứng yên, giảm độ trễ khi chuyển động nhanh. Chạy cho từng trục x/y/z.

```ts
interface LowPassState { hasPrev: boolean; prev: number; }

class OneEuro {
  constructor(
    private minCutoff = 1.0,
    private beta = 0.007,
    private dCutoff = 1.0,
  ) {}
  private x = new LowPassState();
  private dx = new LowPassState();

  private static alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(value: number, dt: number): number {
    const dValue = this.x.hasPrev ? (value - this.x.prev) / dt : 0;
    const edValue = this.dx.hasPrev
      ? this.dx.prev + OneEuro.alpha(this.dCutoff, dt) * (dValue - this.dx.prev)
      : dValue;
    this.dx = { hasPrev: true, prev: edValue };

    const cutoff = this.minCutoff + this.beta * Math.abs(edValue);
    const out = this.x.hasPrev
      ? this.x.prev + OneEuro.alpha(cutoff, dt) * (value - this.x.prev)
      : value;
    this.x = { hasPrev: true, prev: out };
    return out;
  }
}
```

Một filter cho mỗi trục của mỗi landmark. `dt` tính bằng timestamp thực tế, không dùng số khung giả định.

Mốc khởi đầu chấp nhận được (chỉnh khi có máy thật):
`minCutoff` 1.0–1.5 Hz, `beta` 0.005–0.02, `dCutoff` 1.0 Hz.

## Visibility gate

```ts
export const MIN_VISIBILITY = 0.5;

export function hasReliableLandmarks(points: Point3D[]): boolean {
  return points.every(p => p.visibility >= MIN_VISIBILITY);
}
```

Khi gate fail:
- Không đếm rep.
- Hiện overlay "Hãy đứng lùi xa để toàn bộ cơ thể nằm trong khung hình".
- Không gọi `/workout-engine/track` với dữ liệu không đủ tin cậy.
- Không hiển thị `corrections` từ server như phán quyết; nếu server trả `confident: false` thì coi đó là lời nhắc chứ không phải kết luận.

## FSM đếm rep

Backend dùng ngưỡng squat: xuống khi góc `< 95`, lên khi góc `>= 155`. App mirror trạng thái để phản hồi tức thì, nhưng **số rep chính thức lấy từ `repetitionCount` của server**.

```ts
type Phase = 'UP' | 'DOWN' | 'TRANSITION';

const DOWN_ENTER_ANGLE = 95;
const UP_RETURN_ANGLE = 155;

function nextPhase(current: Phase, angle: number): Phase {
  if (current === 'UP' && angle < DOWN_ENTER_ANGLE) return 'DOWN';
  if (current === 'DOWN' && angle >= UP_RETURN_ANGLE) return 'UP';
  return angle < UP_RETURN_ANGLE ? 'DOWN' : 'TRANSITION';
}
```

Chỉ tăng bộ đếm cục bộ khi có chuyển `DOWN → UP` **và** gate visibility đạt trong suốt chu kỳ rep. Đó là điều kiện "rep chỉ được ghi nhận khi landmark đủ tin cậy" trong `phases/phase-3-realtime.md`.

## Đồng bộ với backend

Gom theo chu kỳ, không phải mỗi frame:

- Mỗi 1–2 giây, gửi một snapshot đại diện (frame có visibility cao nhất trong khoảng).
- Hoặc gửi khi phase chuyển `UP → DOWN` và `DOWN → UP`.
- Bỏ qua hoặc đánh dấu pending khi mạng yếu; tích lũy cục bộ rồi gửi lại sau.

```ts
await workoutService.track({
  exercise: 'squat',
  jointAngle: latestAngle,
  visibility: worstVisibility,
});
// backend đọc từ query string, xem api-contract.md
```

## Feedback và cooldown

Lỗi chuẩn hoá cần hỗ trợ (từ `AI_ROADMAP.md`): `KNEE_VALGUS`, `ROUNDED_BACK`, `SHALLOW_DEPTH`, `KNEES_OVER_TOES`, `INSUFFICIENT_DEPTH`.

Mỗi lỗi có: `severity`, `message` tiếng Việt, `evidence` (frame/metric), `cooldown`.

```ts
const FEEDBACK_COOLDOWN_MS = 4000;
```

Cùng một lỗi không được phát lại trong khoảng cooldown, tránh spam TTS. TTS dùng voice `vi-VN`. Không gọi Gemini để sinh câu nhắc trong lúc tập; câu nhắc phải sẵn từ server hoặc từ dictionary local.

Danh sách cảnh báo an toàn, hiển thị bằng tiếng Việt:
- KNEE_VALGUS: "Đẩy gối ra ngoài, tránh gối lệch vào trong."
- ROUNDED_BACK: "Giữ lưng thẳng, không cong lưng."
- SHALLOW_DEPTH: "Hạ sâu hơn một chút."
- LOW_VISIBILITY: "Lùi xa để toàn bộ cơ thể nằm trong khung hình."

## Hiệu năng

- Đưa detection và filter vào worklet/frame processor nếu có thể; nếu không, giảm tần số xử lý xuống 15 fps cho logic nặng, camera vẫn 30 fps.
- Overlay vẽ bằng `react-native-svg`, dùng transform trên UI thread, không setState mỗi frame.
- Không giữ toàn bộ lịch sử frame trong state. Chỉ giữ số tổng hợp.
- Sử dụng `useRef` + subscription thay vì `useState` cho dữ liệu tần suất cao.

## Test offline

Fixture landmark dạng file JSON, chạy qua pipeline không cần camera:
- Bộ tư thế tốt → không phát cảnh báo.
- Bộ visibility thấu → gate fail, không đếm rep.
- Bộ squat đủ chu kỳ UP→DOWN→UP → đếm đúng số rep.
- Bộ squat nông → phát `SHALLOW_DEPTH`.

Đây là yêu cầu trong `phases/phase-3-realtime.md` và phải chạy được trước khi bật camera thật.
