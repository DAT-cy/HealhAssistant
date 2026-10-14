# Checklist triển khai Health Assistant — 15 tuần

Checklist này khớp với `../DO_AN.md`, `Business.md` và `AI_ROADMAP.md`. Đánh dấu hoàn thành chỉ sau khi có thay đổi trong source và bằng chứng kiểm tra; không dùng checklist như xác nhận thay cho test.

## Tuần 1–3 — Khảo sát và cơ sở lý thuyết

- [ ] Chạy mobile/backend/DB theo hướng dẫn; ghi command, phiên bản, lỗi và log baseline.
- [ ] Đối chiếu màn hình, API service, controller, DTO, entity, schema và test hiện có.
- [ ] Tách chức năng thành `đã chạy`, `có source nhưng chưa chạy`, `demo/mock`, `chưa có`.
- [ ] Chốt mục tiêu MVP, người dùng, dữ liệu nhạy cảm, consent và giới hạn không chẩn đoán.
- [ ] Nghiên cứu REST/JWT, React Native/Expo, Spring Boot/MySQL, landmark và LLM có schema; trích nguồn đã đọc.

## Tuần 4–6 — Phân tích và thiết kế

- [ ] Viết use case: tài khoản mới, hồ sơ, preview, chọn, activate, calendar, daily plan, workout, progress.
- [ ] Đặc tả empty/loading/error/partial/active/completed states và tiêu chí BUS trong `Business.md`.
- [ ] Đối chiếu ERD với entity/schema thật; ghi khóa, nullable, unique/index, retention và quyền dữ liệu.
- [ ] Đặc tả API request/response, validation, lỗi, auth và ownership; không nhận userId client làm quyền.
- [ ] Thiết kế roadmap có N tuần, source, safety notes, status và transaction archive/activate.
- [ ] Chốt cách ghi nhận lịch: ngày lịch không mặc định là workout hoàn tất.

## Tuần 7–8 — Profile và preview

- [ ] Profile lưu mục tiêu, activity level, tuổi tùy chọn, chiều cao/cân nặng, hạn chế, vùng khó chịu và consent.
- [ ] Preview chỉ chạy khi profile tồn tại, consent bật và số đo bắt buộc hợp lệ; backend phải tự xác thực.
- [ ] Tạo đúng ba lựa chọn; output JSON được validate theo schema và số tuần.
- [ ] Preview không thay đổi roadmap ACTIVE; AI lỗi có fallback được gắn nhãn hoặc lỗi rõ ràng.
- [ ] UI cho người dùng so sánh tiêu đề, mục tiêu tuần, thời lượng, nguồn và safety notes.
- [ ] Ảnh đại diện không được đưa vào prompt. Không mô tả landmark demo là phân tích ảnh thật.

## Tuần 9–10 — Activation và Home calendar

- [ ] Chỉ cho xác nhận sau khi người dùng chọn một phương án.
- [ ] Backend kiểm tra consent, số đo, duration, field/size và source khi activate.
- [ ] Archive lộ trình cũ và lưu lộ trình mới trong một transaction; kiểm thử rollback khi lưu lỗi.
- [ ] Mỗi user chỉ đọc/ghi roadmap của chính họ; test truy cập chéo tài khoản.
- [ ] Home mới hiển thị empty state/CTA, không có workout/progress mẫu.
- [ ] Home active hiển thị start date, tổng số ngày, trọng tâm theo tuần và lịch toàn thời lượng.
- [ ] Ngày đã qua không hiện checkmark hoàn thành nếu không có workout record.
- [ ] Hết thời lượng hiển thị trạng thái kết thúc, không khởi động lại ngày cuối.

## Tuần 11–12 — Daily plan, workout và progress

- [ ] Daily plan gắn với user/ngày và roadmap; xử lý timezone/date boundary.
- [ ] Mọi nội dung AI qua schema validation, safety gate và fallback; consent được kiểm tra trước khi gọi.
- [ ] Workout record chỉ ghi từ thao tác thực tế; progress chỉ tổng hợp dữ liệu đã lưu.
- [ ] Nút dừng và luồng xử lý đau/khó chịu rõ ràng.
- [ ] Tích hợp E2E: đăng nhập → profile → preview → chọn → activate → Home → daily plan → workout → progress.

## Tuần 13 — Evaluation và đóng gói

- [ ] Unit test validation, safety rules, schema mapper, calendar date math và transaction.
- [ ] API test request/response, status/error, timeout, fallback và JWT ownership.
- [ ] AI test JSON lỗi/thiếu field/sai số tuần, timeout/quota, đầu vào không an toàn và prompt injection.
- [ ] Chạy test thực tế, lưu log/version/môi trường; báo pass/fail đúng kết quả.
- [ ] Kiểm tra secrets, PII trong log, chính sách ảnh/media và hướng dẫn setup.

## Tuần 14–15 — Báo cáo và demo

- [ ] Chụp màn hình từ bản chạy thật; phân biệt ảnh/data mô phỏng.
- [ ] Báo cáo kiến trúc, use case, ERD, API, test matrix, lỗi còn tồn tại và giới hạn AI/pose.
- [ ] Không nêu accuracy, latency, pass rate hay KPI chưa đo.
- [ ] Kiểm tra cài mới, tài khoản demo, mạng, database và fallback cho demo.
- [ ] Tổng duyệt kịch bản: tài khoản mới → nhập hồ sơ → chọn preview → xác nhận → xem lịch → ghi nhận buổi tập.

## Việc chưa được tính là hoàn thành

- Camera/MediaPipe: app hiện dùng landmark demo.
- Đánh giá từ ảnh cơ thể: chưa triển khai; ảnh đại diện chỉ dùng để hiển thị.
- RAG/vector database, chat history, trend chi tiết, TTS và offline cache: chỉ làm nếu được chốt phạm vi và có nghiệm thu riêng.
- AI roadmap thật: chưa được xác minh nếu chưa cấu hình key và chạy test qua backend.
