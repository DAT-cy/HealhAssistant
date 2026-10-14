# Phase 4 - Productization

## Scope

- Persist user profile, scan reports, plans và workout sessions.
- Home empty state cho tài khoản mới; roadmap active và calendar theo ngày/thời lượng.
- Kiểm thử luồng profile → preview ba lựa chọn → activation → Home → daily plan → workout → progress.
- Chỉ đo precision/recall/góc/latency/chi phí khi có dataset và lệnh chạy ghi nhận kết quả.

## Demo script

1. Đăng nhập tài khoản mới và cho thấy Home rỗng.
2. Nhập hồ sơ/consent, tạo preview và so sánh ba phương án.
3. Chọn, xác nhận một phương án và xem lịch trên Home.
4. Mở daily plan, ghi nhận workout và xem progress từ dữ liệu đã lưu.
5. Chỉ demo posture/workout camera nếu MediaPipe pipeline đã thay landmark fixture và được kiểm thử; nếu chưa, phải ghi rõ là mô phỏng.

## Báo cáo AI

- Mô tả dataset, cách gắn nhãn, feature engineering và model selection.
- Báo cáo metric chỉ khi đã chạy test trên bộ dữ liệu mô tả được; nêu cả giới hạn, fallback và sai số.
- Phân tích lỗi, bias theo người/camera/view và các giới hạn an toàn.
