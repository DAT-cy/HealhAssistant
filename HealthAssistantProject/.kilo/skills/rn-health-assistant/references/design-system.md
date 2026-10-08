# Design System

Mục tiêu: app nhất quán, dễ đọc khi đang tập, và an toàn về accessibility. Token ở `src/theme/tokens.ts`, không rải giá trị trong component.

## Màu

Nền tối ưu cho phòng tập: tối hơn màn hình sáng, dễ nhìn landmark overlay.

```ts
export const palette = {
  // nền
  bg: '#0B0F14',
  surface: '#131A22',
  surfaceRaised: '#1B242E',
  border: '#2A3542',

  // chữ
  text: '#F2F5F8',
  textMuted: '#9AA7B4',
  textInverse: '#0B0F14',

  // thương hiệu
  primary: '#22C55E',
  primaryMuted: '#16A34A',
  accent: '#38BDF8',

  // trạng thái
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',

  // overlay
  overlayScrim: 'rgba(11, 15, 20, 0.72)',
  landmark: '#38BDF8',
  landmarkProblem: '#EF4444',
} as const;
```

Ngữ nghĩa: `danger` cho lỗi form và cảnh báo đau, không dùng cho trang trí. `warning` cho visibility thấp và fallback của AI.

## Spacing

Thang 4: `2, 4, 8, 12, 16, 24, 32, 48`.

```ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
```

## Typography

```ts
export const fontSize = {
  caption: 12,   // nhãn nhỏ, timestamp
  body: 14,      // mặc định
  subtitle: 16,
  title: 20,
  heading: 24,
  display: 32,   // số rep, số đo lớn
} as const;
```

Số lớn như rep count dùng `fontVariant: ['tabular-nums']` để không nhảy layout khi đếm.

## Bán kính và bóng

```ts
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const shadow = {
  card: { shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
};
```

## Component gốc

Chỉ xây các component sau, dùng lại xuyên app:

| Component | Vai trò |
|---|---|
| `Screen` | Wrapper: nền, safe area, padding, cuộn |
| `Card` | Bề mặt nâng cao + border |
| `AppButton` | primary / secondary / danger / ghost, trạng thái loading và disabled |
| `AppInput` | Nhãn, lỗi từ server, hỗ trợ `accessibilityLabel` |
| `Select` | Chọn mục tiêu, cấp độ, thiết bị |
| `Badge` | Nhãn trạng thái: `fallback`, `offline`, `reliable` |
| `MetricRow` | Nhãn + đơn vị + giá trị lớn (dùng cho góc tư thế, calories) |
| `ListRow` | Dòng danh sách có chevron |
| `LoadingState` | Skeleton hoặc spinner + nhãn tiếng Việt |
| `EmptyState` | Chưa có dữ liệu + hành động gợi ý |
| `ErrorState` | Thông điệp lỗi tiếng Việt + nút thử lại |
| `SafetyBanner` | Cảnh báo an toàn, luôn nổi bật, không tự ẩn |
| `ProgressRing` | Vòng tiến độ tập |
| `Skeleton` | Placeholder khi load |

Mỗi component nhận `style` và `accessibilityLabel`, và luôn nhận diện rõ khi disabled.

## Quy tắc cụ thể cho app này

- Số đo tư thế khi `reliable === false`: hiển thị dạng mờ kèm nhãn "Độ tin cậy thấp", tuyệt đối không trình bày như kết luận.
- Roadmap có `source === 'fallback'':` gắn `Badge` màu `warning` với nhãn "Kế hoạch dự phòng".
- Đồng hồ đếm rep dùng `display`, màu `text`, và có `accessibilityLiveRegion="polite"` để bản đọc màn hình đọc số rep.
- Nút dừng bài tập luôn ở vị trí cố định, kích thước đủ lớn, không bị che bởi overlay.
- Màn hình workout ưu tiên chữ lớn, tương phản cao vì người dùng đang di chuyển.

## Chuỗi tiếng Việt

Toàn bộ chuỗi nằm ở `src/i18n/vi.ts`, không hardcode trong component. Ví dụ:

```ts
export const strings = {
  scan: {
    title: 'Quét tư thế',
    guideFront: 'Đứng thẳng người, chụp chính diện, toàn bộ cơ thể nằm trong khung hình.',
    guideSide: 'Đứng nghiêng 90 độ so với camera, toàn bộ cơ thể nằm trong khung hình.',
    lowVisibility: 'Chưa nhận được đủ điểm mốc. Hãy lùi xa và chỉnh lại góc máy.',
    unreliable: 'Độ tin cậy thấp, kết quả chỉ mang tính tham khảo.',
  },
  workout: {
    start: 'Bắt đầu',
    stop: 'Dừng bài',
    reps: 'Số lần lặp',
    feedback: {
      KNEE_VALGUS: 'Đẩy gối ra ngoài, tránh gối lệch vào trong.',
      ROUNDED_BACK: 'Giữ lưng thẳng, không cong lưng.',
      SHALLOW_DEPTH: 'Hạ sâu hơn một chút.',
      KNEES_OVER_TOES: 'Đẩu gối lùi, không cho gối vượt qua các ngón chân.',
      INSUFFICIENT_DEPTH: 'Hạ thấp hông thêm một chút nữa.',
    },
  },
  safety: {
    painTitle: 'Bạn có đang cảm thấy đau không?',
    stopNow: 'Dừng bài ngay',
    disclaimer: 'Công cụ này hỗ trợ tập luyện, không thay thế chẩn đoán hoặc điều trị y khoa.',
  },
} as const;
```

Key theo mảng chấm, không dấu chấm phẳng.

## Dark mode

App vốn đã tối. Nếu hỗ trợ light mode, token phải có hai bộ và `ThemeProvider` cấp qua context. Không dùng `useColorScheme` rải rác trong component.
