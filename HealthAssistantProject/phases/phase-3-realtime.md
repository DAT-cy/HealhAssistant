# Phase 3 - Real-time Training

## Scope

- One Euro Filter hoặc bộ lọc tương đương cho landmark.
- FSM `UP -> DOWN -> UP` cho squat, bridge và curl.
- Rule phát hiện knee valgus, knees-over-toes, rounded back và insufficient depth.
- TTS feedback với cooldown để tránh lặp âm thanh.

## Done criteria

- Rep chỉ được ghi nhận khi landmark đủ tin cậy.
- Lỗi kỹ thuật có severity, frame evidence và message tiếng Việt.
- Có test offline trên video/landmark fixtures trước khi bật camera thật.
- Có benchmark rule-based và ML cho ít nhất ba bài tập.
- Có form quality score dùng làm tín hiệu cho adaptive difficulty.
