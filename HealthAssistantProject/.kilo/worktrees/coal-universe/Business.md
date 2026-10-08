# Business Requirements

## Định hướng đồ án AI

Đây là đồ án nghiên cứu ứng dụng AI, không chỉ là ứng dụng CRUD. Giá trị chính nằm ở pipeline dữ liệu, model có đánh giá, LLM có kiểm soát và kết quả được chứng minh bằng metric.

## 1. Người dùng mục tiêu

- Người muốn giảm cân, tăng cơ hoặc cải thiện tư thế tại nhà.
- Người mới cần hướng dẫn bài tập và phản hồi dễ hiểu.
- Người phục hồi vận động nhẹ dưới hướng dẫn của chuyên gia.
- Huấn luyện viên cần dashboard theo dõi tiến độ nhiều người.

## 2. Luồng nghiệp vụ chính

1. Người dùng tạo hồ sơ: chiều cao, cân nặng, tuổi, giới tính, mức vận động, mục tiêu và hạn chế sức khỏe.
2. Người dùng thực hiện scan chính diện và nghiêng; client gửi landmark cùng visibility score.
3. Hệ thống sinh `Posture Assessment Report` dạng JSON gồm chỉ số, độ tin cậy, phát hiện và khuyến nghị.
4. Coach Engine tạo roadmap theo tuần/tháng với mục tiêu đo được và mức tải tăng dần.
5. Mỗi ngày hệ thống tạo workout, menu, calories và macro phù hợp với roadmap.
6. Trong lúc tập, Pose Engine làm mượt landmark, đếm rep, phát hiện lỗi và gửi feedback.
7. Sau buổi tập, hệ thống lưu completed reps, lỗi, thời lượng, calories ước tính và cập nhật tiến độ.

## 3. Quy tắc nghiệp vụ

- Chỉ kết luận scan khi các landmark bắt buộc có visibility `>= 0.5`.
- Ngưỡng posture phải versioned để tái lập kết quả và dễ kiểm thử.
- Không tự động đưa ra chẩn đoán bệnh hoặc cam kết kết quả y khoa.
- LLM chỉ được trả về JSON schema hợp lệ; dữ liệu calories/macro phải được kiểm tra bằng rule engine.
- Không gửi video thô tới LLM; chỉ gửi dữ liệu đã trích xuất và tối thiểu cần thiết.
- Khi confidence thấp hoặc người dùng báo đau, phải giảm tải/dừng bài và hiển thị cảnh báo.

## 4. KPI MVP

- Posture report trả về dưới 2 giây với landmark đã có sẵn.
- Rep counting đạt precision/recall mục tiêu từ 90% trong bộ test nội bộ.
- 100% output roadmap/daily plan vượt qua JSON schema validation.
- Người dùng hoàn thành được luồng demo Scan -> Roadmap -> Daily Plan -> Workout.

## 5. API contract cốt lõi

- `POST /api/v1/posture/assess`: nhận landmarks, trả posture report.
- `POST /api/v1/pose-engine/angle`: nhận ba điểm, trả góc độ.
- Dự kiến: `POST /api/v1/roadmaps`, `GET /api/v1/daily-plans/{date}`, `POST /api/v1/workouts/sessions`.

## 6. Dữ liệu và quyền riêng tư

- Ưu tiên lưu landmark và feature vector thay vì video thô.
- Tách train/validation/test theo người để tránh data leakage.
- Cho phép xóa profile, scan report và workout history.
- Loại bỏ thông tin nhận diện không cần thiết trước khi gọi LLM.

## 7. Tiêu chí đánh giá AI

- So sánh baseline rule-based với ML classifier bằng precision, recall và F1.
- Đo sai số góc tư thế bằng MAE/RMSE.
- Đo rep counter trên từng session thay vì chỉ từng frame.
- Đo JSON validity, fallback rate, latency và token cost của LLM.
