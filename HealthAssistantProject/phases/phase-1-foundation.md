# Phase 1 - Foundation

## Scope

- Chuẩn hóa landmark contract từ MediaPipe Pose.
- Hoàn thiện static posture assessment cho front/side view.
- Tính shoulder imbalance, pelvic tilt và forward head.
- Áp dụng visibility gate và trả về report có findings/recommendations.

## Done criteria

- Có fixture tốt, fixture landmark thiếu visibility và fixture lệch tư thế.
- Góc được kiểm thử với sai số chấp nhận được.
- Không kết luận khi confidence dưới ngưỡng.
- OpenAPI mô tả request/response.
- Có baseline rule-based và bộ metric để so sánh với ML.
- Train/validation/test được tách theo người nhằm tránh data leakage.
