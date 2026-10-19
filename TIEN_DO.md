# Tiến độ và rà soát nghiệp vụ Health Assistant

Cập nhật: 19/10/2026  
Phạm vi rà soát: `SKILL.md`, `Skill1.md`, mã nguồn mobile/backend và database MySQL đang chạy.

## Kết luận

Hai file mô tả một hướng sản phẩm hợp lý: hồ sơ có consent, kế hoạch do AI đề xuất nhưng người dùng phải xác nhận, dữ liệu thực tế không bị đánh dấu hoàn thành tự động, và tính năng sức khỏe phải có giới hạn an toàn. Tuy nhiên đây là tài liệu mục tiêu, không phải danh sách tính năng đã hoàn tất. Phạm vi tổng thể quá rộng để xem ứng dụng hiện tại là hoàn chỉnh.

Đợt Health Journal đã có luồng check-in, cân nặng và tổng hợp tuần/tháng. Các module kế hoạch, hồ sơ, mục tiêu, lịch rảnh, Google auth và quản trị Knowledge Base có phần chạy được. Nutrition, notifications, gamification, RAG thực sự và lịch sử điều chỉnh lộ trình chưa có luồng end-to-end.

## Đánh giá hai file

### `SKILL.md`

- Điểm tốt: nhấn mạnh quyền sở hữu dữ liệu, consent, kiểm tra kết quả AI, empty/error/loading state, không giả lập thành công và yêu cầu báo đúng giới hạn.
- Cần coi danh sách màn hình, endpoint và bảng là ứng viên theo nghiệp vụ; không triển khai tất cả cùng lúc. File đã ghi đây là định hướng, nhưng các đoạn “hoàn chỉnh toàn bộ” và tiêu chí nghiệm thu vẫn dễ khiến phạm vi bị hiểu là phải làm tất cả trước khi bàn giao.
- Cần thống nhất tài liệu với repo: ứng dụng hiện dùng Gradle, API client `fetch`, design system sáng indigo/xanh; không nên coi Maven, Axios hay palette xanh lá/trắng là ràng buộc của implementation hiện tại.
- `refresh token`, reset/verify email, notifications, food/workout CRUD và RAG là mục tiêu tương lai; không được coi là đã có chỉ vì xuất hiện trong prompt.

### `Skill1.md`

- Điểm tốt: thứ tự theo đợt, ưu tiên Health Journal → Adaptive Planning → Nutrition → Workout; yêu cầu API/entity/security/test tương ứng; chỉ áp dụng thay đổi kế hoạch sau xác nhận.
- Cần giữ nguyên nguyên tắc “không tạo bảng/API rỗng”. Các entity `FoodCatalog`, `MealLog`, `MealLogItem`, `ExerciseCatalog`, `PlanAdjustment` hiện mới là nền schema, chưa đồng nghĩa các nghiệp vụ tương ứng đã hoạt động.
- Giai đoạn Health Journal hiện mới hỗ trợ cân nặng, năng lượng, giấc ngủ, chất lượng ngủ, mệt mỏi, tâm trạng, hoạt động và ghi chú. Chưa có nhắc check-in, lịch sử theo tháng riêng, cảnh báo dữ liệu bất thường cần người dùng xác nhận hoặc health profile đầy đủ như prompt.
- Hướng dẫn schema hiện dùng entity JPA và `ddl-auto: update` theo quyết định của dự án; không dùng Flyway.

## Trạng thái theo nghiệp vụ

| Nghiệp vụ | Trạng thái | Ghi chú |
|---|---|---|
| Email/mật khẩu, Google sign-in, phân vai USER/ADMIN | Đã có một phần chạy được | Có API và auth identity; Google OAuth cần client ID hợp lệ để xác minh end-to-end trên thiết bị. |
| Hồ sơ, consent, mục tiêu, lịch rảnh, avatar | Đã có API/UI | Dữ liệu hồ sơ hiện tại và lịch sử cân nặng cần tiếp tục được phân định rõ. |
| Preview 3 phương án roadmap, chọn và activate | Đã có luồng backend/mobile | Có version number, parent version, prompt/schema version, history DTO và preview dùng một lần; calendar ngày tập có cấu trúc và pause/resume còn thiếu. |
| Daily check-in và cân nặng | Đã có API/UI/entity | Check-in lưu một bản ghi/người/ngày; cân nặng đồng bộ vào `weight_logs`. Ghi check-in ngày cũ không được sửa cân nặng hiện tại trong profile. |
| Dashboard tiến độ | Một phần | Summary hiện đếm posture report, roadmap và workout session; chưa có analytics tuân thủ ăn/tập hay báo cáo nghiệp vụ đầy đủ. |
| Daily plan | Một phần | Có AI/fallback; fallback là template vận động, không được trình bày như kế hoạch cá nhân hóa hoặc AI thật. |
| Workout/pose | Demo một phần | Engine/session có source; UI hiện gửi landmark mẫu và camera chưa được kết nối. Không dùng kết quả demo như phân tích camera thật. |
| Nutrition | Schema/entity mới có | Chưa có API danh mục/tìm kiếm/thay món/meal logging và chưa có luồng người dùng hoàn chỉnh. |
| Knowledge Base admin | Có nghiệp vụ chính | Có upload, duyệt, lưu trữ, audit; đây là màn quản trị riêng, không phải màn user. RAG truy xuất để trả lời chat chưa được xác minh. |
| AI Coach | Một phần | Có chat với ngữ cảnh profile; chưa có hội thoại lưu bền vững, citations/RAG và đánh giá chất lượng đầy đủ. |
| Notifications/scheduler | Chưa triển khai | Chưa có notification center, preference, scheduler hay push delivery. |
| Gamification/challenge/streak | Chưa triển khai | Chưa có dữ liệu hoặc quy tắc điểm thưởng. |

## Rà soát mô hình dữ liệu

- Database hiện có 21 bảng nghiệp vụ; ERD nằm tại `HealthAssistantProject/HEALTH_ASSISTANT_ERD.drawio`.
- Các bảng meal, food, exercise và plan adjustment có entity nhưng hiện chưa có service/API nghiệp vụ tương ứng.
- Nhiều cột `user_id` là liên kết logic nhưng chưa có FK vật lý. ERD phân biệt FK thật bằng đường liền và liên kết logic bằng đường đứt.
- `user_profiles.weight_kg`, `weight_logs.weight_kg` và `daily_checkins.weight_kg` có dữ liệu cân nặng ở ba ngữ cảnh. Quy tắc hiện tại: profile là giá trị hiện tại, weight log là lịch sử chuẩn hóa theo ngày, check-in là nhật ký tổng hợp; cần tránh ghi ngược số đo lịch sử vào profile.
- `daily_plans.activities` là nội dung TEXT/JSON, chưa liên kết có cấu trúc tới `exercise_catalog`; `roadmap_previews.options_json` là bản preview tạm thời, không phải lịch sử phiên bản lộ trình.
- `plan_adjustments` mới có schema nền; chưa lưu đủ snapshot kế hoạch trước/sau, sự kiện đầu vào, người xác nhận và trạng thái hết hạn như yêu cầu Skill1.
- Consent hiện là boolean; nếu cần audit pháp lý/sản phẩm, cần lưu thời điểm, phiên bản nội dung consent và cách rút lại consent.
- `ddl-auto: update` phù hợp môi trường phát triển hiện tại để entity tạo/cập nhật bảng. Trước production cần quy trình schema được kiểm soát và backup; không chạy tự động thay đổi phá hủy dữ liệu.

## Đã bổ sung trong đợt Adaptive Planning

- Mỗi lần activate lưu version number, roadmap trước đó, lý do đổi, prompt version và schema version.
- Preview bị khóa khi activate và chỉ được tiêu thụ một lần; profile được khóa trong transaction để tránh hai lần activate đồng thời tạo cùng version.
- Roadmap cũ được archive và bản mới được lưu trong cùng transaction; API active/history/detail trả DTO và truy vấn theo user hiện tại.
- Mobile Roadmap đọc roadmap active và lịch sử, cho mở phiên bản cũ và so sánh overview hiện tại với phiên bản trước.
- Bản ghi roadmap cũ chưa có version number sẽ được gán version khi lần tiếp theo tạo phiên bản.
- Từ dữ liệu check-in thật, backend chỉ tạo draft giảm tải khi có ít nhất hai tín hiệu readiness thấp trong bảy ngày; draft ghi lại các ngày làm căn cứ, không tự thay roadmap.
- Mobile có thể xem tuần bị ảnh hưởng và phần thay đổi trước/sau, sau đó chấp nhận để tạo roadmap version kế tiếp hoặc từ chối.

## Ưu tiên tiếp theo

1. Kiểm thử integration/E2E cho activation, preview one-time, adjustment ownership, chấp nhận/từ chối và rollback transaction trên database.
2. Adaptive Planning: liên kết proposal với event workout/meal có cấu trúc khi các luồng đó được triển khai; hiện rule chỉ dùng readiness check-in.
3. Workout: thay landmark mẫu bằng camera/pose pipeline thật hoặc giữ nhãn demo rõ ràng; ghi session theo trạng thái, chống gửi hoàn tất trùng.
4. Nutrition: nguồn/xác minh dinh dưỡng, API tìm thực phẩm, ghi bữa ăn từ snapshot, kiểm tra dị ứng trước đề xuất thay thế.
5. Sau các luồng cốt lõi mới triển khai analytics mở rộng, RAG/citations, notifications/scheduler rồi gamification.

## Kiểm tra và giới hạn

- Database được đọc trực tiếp từ MySQL đang chạy; số bảng và cột trong ERD phản ánh schema tại thời điểm cập nhật.
- Backend `gradlew test`, mobile TypeScript/lint mục tiêu, Expo web export và Android export đã chạy thành công sau đợt này.
- Chưa xác nhận luồng end-to-end bằng tài khoản thật cho tất cả module.
- AI phụ thuộc key/provider bên ngoài; chưa coi roadmap/chat là AI thật nếu chưa chạy với cấu hình hợp lệ.
- Camera pose hiện là demo landmark; chưa có MediaPipe/camera pipeline thật.
