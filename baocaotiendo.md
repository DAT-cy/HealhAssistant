# BÁO CÁO TIẾN ĐỘ DỰ ÁN HEALTH ASSISTANT

**Ngày khảo sát:** 16/11/2026  
**Phạm vi:** source code hiện có trong workspace, gồm `heathreact/` (mobile React Native) và `HealthAssistantProject/` (Spring Boot).  
**Nguyên tắc:** báo cáo phân biệt mã nguồn đã tồn tại với chức năng đã được kiểm thử vận hành. Không suy diễn chức năng chỉ từ tên màn hình hoặc tài liệu thiết kế.

## I. Tổng quan dự án

Health Assistant là ứng dụng hỗ trợ theo dõi hồ sơ sức khỏe, mục tiêu, lộ trình luyện tập, nhật ký dinh dưỡng và tiến độ cá nhân. Backend cung cấp các API cho hồ sơ, lộ trình, AI, workout, posture, nhật ký và các tính năng mở rộng; mobile gọi API qua một client dùng chung.

- **Frontend:** React Native, Expo SDK 58, TypeScript strict, Expo Router, TanStack Query, Zustand, React Hook Form/Zod. Route file nằm trong `heathreact/app/`; màn hình nghiệp vụ nằm trong `heathreact/src/features/Health/pages/`.
- **Backend:** Spring Boot 3.2.3, Java source compatibility 17, Spring Web/Security/Data JPA/Validation/WebFlux/Mail, MyBatis, MySQL, JWT, Swagger, Apache Tika, Cloudinary và Stripe SDK. Cấu hình và dependency nằm trong `HealthAssistantProject/build.gradle`.
- **AI:** `GeminiClient` gọi Gemini qua WebClient. Các service roadmap, daily plan, coach và meal analysis có kiểm tra cấu trúc đầu ra; một số luồng có fallback khi thiếu key hoặc AI lỗi.
- **Kiến trúc:** frontend dùng file-based routing và service API; backend tổ chức theo module nghiệp vụ với Controller → Service → Repository → Entity/DTO. Cơ sở dữ liệu có các script khởi tạo trong `HealthAssistantProject/db/init/` và JPA `ddl-auto: update` trong cấu hình môi trường.

Số liệu cấu trúc quan sát được: 22 route `.tsx`, 14 file API service, 27 controller, 43 service bean, 38 entity và 104 phương thức `@Test` trong 34 file test Java. Đây là số lượng mã nguồn, không phải số chức năng đã nghiệm thu.

## II. Tổng quan tiến độ

Tiêu chí phân loại trong báo cáo:

- **Đã hoàn thành ở mức mã nguồn:** có luồng nghiệp vụ và điểm tích hợp rõ ràng, kèm bằng chứng test hoặc xử lý trạng thái tương ứng; chưa đồng nghĩa đã nghiệm thu E2E.
- **Đang phát triển:** đã có một phần frontend/backend nhưng còn fallback, placeholder, thiếu tích hợp hoặc thiếu điều kiện vận hành.
- **Chưa triển khai:** không tìm thấy luồng triển khai tương ứng trong source.
- **Chưa xác minh:** có mã nguồn nhưng không thể chạy kiểm thử thực tế trong môi trường khảo sát.

Theo 10 nhóm module được khảo sát, **không có module nào được xác nhận hoàn thành E2E** vì backend không thể chạy trong môi trường này (không có `java`/`JAVA_HOME`). Ở mức source, 8 module có luồng backend/frontend đáng kể và đang ở trạng thái phát triển hoặc cần xác minh; 1 module mở rộng có phần triển khai đáng kể; 1 module chưa triển khai.

Tóm tắt theo cách đếm trên: **tổng 10 module; hoàn thành E2E 0; đang phát triển hoặc chưa xác minh 9; chưa triển khai 1**. Con số này không phải tỷ lệ phần trăm tiến độ và không dùng để thay thế nghiệm thu chức năng.

Các vấn đề nổi bật:

1. Chưa chạy được bộ test Gradle hoặc API smoke test do thiếu JDK.
2. `npm run lint` thất bại với 86 lỗi và 4 cảnh báo, chủ yếu do các thư mục component Vue cũ được ESLint quét cùng ứng dụng React Native, import `expo-router` không resolve trong cấu hình hiện tại và lỗi hook ở `useDebounce.ts`. `npx tsc --noEmit` chạy thành công.
3. Camera/pose pipeline thật chưa được kết nối; `Workout.tsx` và `Scan.tsx` gửi landmark mẫu.
4. Google Login đã bị loại khỏi UI mobile trong thay đổi hiện tại nhưng vẫn còn endpoint `/api/v1/auth/google`, `GoogleAuthService` và dependency Google ở backend.
5. `HealthAssistantProject/docker-compose.yml` chứa giá trị mặc định nhạy cảm cho Gemini và Cloudinary, cùng mật khẩu/database/JWT mặc định; đây là rủi ro cần xử lý trước khi chia sẻ hoặc triển khai.

## III. Chi tiết tiến độ từng module

| STT | Module | Nội dung công việc | Trạng thái | Ghi chú |
|---:|---|---|---|---|
| 1 | Authentication và quản lý tài khoản | Đăng nhập, đăng ký OTP, xác minh OTP, quên/đặt lại mật khẩu, lưu token và điều hướng theo role | Đang phát triển / chưa xác minh | `AuthController`, `OtpService`, `UserServiceImpl`, `auth.service.ts`, `Login.tsx` có luồng thật. Chưa kiểm thử runtime; Google còn ở backend. |
| 2 | Hồ sơ sức khỏe cá nhân | Onboarding, hồ sơ, consent, mục tiêu, lịch rảnh, avatar | Đang phát triển / chưa xác minh | Có `ProfileController`, `HealthGoalController`, `AvailabilitySlotController` và service tương ứng; cần xác minh dữ liệu thực tế và các ràng buộc hồ sơ. |
| 3 | Quản lý lộ trình sức khỏe | Tạo bản nháp, xem preview, chọn phương án, đặt tên, kích hoạt, lịch sử, lịch ngày, hoàn thành/bỏ qua | Đang phát triển | `useRoadmap.ts`, `Roadmap.tsx`, `RoadmapWizard.tsx` gọi các API preview/activate/draft/schedule; backend có versioning và kiểm tra trạng thái. Chưa có E2E. |
| 4 | AI tạo lộ trình dinh dưỡng và luyện tập | Gọi Gemini, kiểm tra JSON/schema, fallback và lưu lộ trình | Đang phát triển / chưa xác minh | Có `GeminiClient`, `GeminiCoachService`, `RoadmapPreviewService`, test `GeminiCoachServiceTest`; chưa xác minh key, model, timeout và chất lượng đầu ra thật. |
| 5 | Thực đơn và chế độ ăn | Nhật ký bữa ăn, khuyến nghị, phân tích ảnh, nguồn Knowledge Base | Đang phát triển | `MealLogController`, `NutritionMealService`, `MealAnalysisService`, `nutrition.service.ts` có API tương ứng. Màn `Nutrition.tsx` chủ yếu hiển thị dữ liệu đã có và có empty state; chưa nghiệm thu upload/phân tích ảnh. |
| 6 | Bài tập và hoạt động thể chất | Session workout, pause/resume/finish, lịch sử, gym session, phân tích pose | Đang phát triển | Có `ActivitySessionController`, `GymWorkoutController`, test service. Màn `Workout.tsx` ghi rõ là thử nghiệm landmark mẫu; camera thật chưa triển khai. |
| 7 | Theo dõi cân nặng và tiến độ | Weight log, daily check-in, summary, progress roadmap | Đang phát triển / chưa xác minh | Có `WeightLogController`, `DailyCheckinController`, `ProgressController`, service mobile và trạng thái loading/error ở các màn liên quan. Chưa chạy API với database thật. |
| 8 | AI Assistant và tư vấn sức khỏe | Coach chat, thread/history, daily review, reschedule, tài liệu cá nhân | Đang phát triển / chưa xác minh | Có `GeminiCoachController`, `CoachChatService`, `PersonalAssistantController`, `PersonalAssistantService`, truy xuất chunk/tài liệu. Cần xác minh RAG, giới hạn rate và phản hồi AI trong môi trường có key. |
| 9 | Thông báo và nhắc nhở | Push notification, lịch nhắc, trạng thái đã đọc | Chưa triển khai | Không thấy module controller/service notification hoặc dependency Expo Notifications tương ứng trong source khảo sát. |
| 10 | Chức năng mở rộng: Knowledge Base, phân quyền tính năng và billing | Admin tài liệu/audit, entitlement, gói dịch vụ và sandbox Stripe/PayPal | Đang phát triển / chưa xác minh | Có controller/service/entity, màn admin và `Subscription.tsx`; billing mới cấu hình sandbox, chưa xác minh webhook/provider thật. |

## IV. Các chức năng đã hoàn thành ở mức mã nguồn

Các mục dưới đây có bằng chứng triển khai rõ trong source, nhưng chưa được gọi là nghiệm thu vận hành do giới hạn môi trường:

- API client mobile dùng chung tại `heathreact/src/api/client.ts`: timeout thường/AI, Bearer token, parse response envelope, xử lý 401, lỗi mạng và lỗi validation.
- Luồng password login, signup bắt đầu OTP, verify OTP, reset password và profile tại `auth.service.ts`, `Login.tsx`, `AuthController` và `OtpService`.
- Luồng lộ trình preview → chọn phương án → activate; backend lưu version, status, lịch slot và lịch sử tại `RoadmapPreviewService`/`RoadmapLifecycleService`.
- API hồ sơ, mục tiêu, lịch rảnh, cân nặng và daily check-in có Controller/Service/Repository/DTO tương ứng.
- API daily plan, meal log/analysis, activity session, gym session và posture assessment có endpoint backend và API service mobile tương ứng.
- Error handling AI tập trung tại `GlobalExceptionHandler`, với thông báo thân thiện cho `GeminiException`; frontend `ApiError`, `ErrorState`, loading và empty state được dùng ở nhiều màn.
- Bộ test đơn vị bao phủ các nhóm access, availability, billing, coach, daily plan, goals, knowledge, media, nutrition, personal assistant, posture, progress, users và workout; hiện chỉ xác nhận sự tồn tại của test, chưa xác nhận kết quả chạy.

## V. Các chức năng đang phát triển

### 1. Authentication và đăng ký

UI mobile hiện không còn nút/SDK Google và các file `googleSignIn` đã bị xóa trong worktree. Tuy nhiên `AuthController.googleLogin()`, `GoogleAuthService` và `GoogleLoginRequest` vẫn còn ở backend. Ngoài ra, text/signup hiện vẫn giới hạn Gmail và nội dung hướng dẫn có nhắc Gmail. Cần quyết định rõ yêu cầu cuối cùng: xóa Google hoàn toàn cả backend hay giữ API nhưng không dùng trên mobile; đồng thời thống nhất chính sách email.

### 2. Tạo lộ trình bằng nút cộng

`RoadmapWizard` có các bước nhập tên lộ trình, mục tiêu, thời lượng, thông tin hồ sơ và lịch; `useRoadmap.generate()` gọi `/api/v1/coach/roadmap/preview`, sau đó `activate()` gọi `/api/v1/coach/roadmap/activate`. Đây là luồng đã có cấu trúc đầy đủ trong code, nhưng chưa chứng minh được việc lưu và tải lại lộ trình trên database thật vì chưa chạy backend.

### 3. AI và fallback

`GeminiClient` có kiểm tra cấu hình và phân loại lỗi; coach/daily plan/chat có nhánh fallback. Fallback giúp tránh lỗi kỹ thuật trực tiếp tới người dùng nhưng không chứng minh AI đã hoạt động hoặc nội dung là cá nhân hóa. Cần kiểm thử với key hợp lệ, key thiếu, timeout, HTTP lỗi và JSON sai schema.

### 4. Posture/camera và gym camera

`Scan.tsx` sử dụng `demoRequest`/`demoLandmark`; `Workout.tsx` có hàm `sendSampleFrame()` và ghi rõ camera chưa kết nối. Backend có endpoint tính toán từ landmark, nhưng pipeline lấy landmark từ camera/MediaPipe chưa có. Đây là giới hạn chức năng cốt lõi, không chỉ là vấn đề giao diện.

### 5. Dinh dưỡng

Backend đã có meal log và phân tích ảnh; mobile có service upload multipart và màn hiển thị kết quả. Tuy vậy màn dashboard hiển thị empty state khi chưa có log và không có bằng chứng đã chạy thành công luồng upload → AI → lưu → tải lại. Cần bổ sung kiểm thử E2E và kiểm tra dữ liệu dinh dưỡng không hợp lệ.

## VI. Các chức năng chưa triển khai

- Push notification, lịch nhắc và trung tâm thông báo.
- Camera pose/MediaPipe thật cho posture và workout; hiện chỉ có landmark mẫu để kiểm tra endpoint.
- Không có bằng chứng một pipeline embedding/vector database hoàn chỉnh dùng chung cho coach chat. Knowledge Base và personal assistant đã có lưu/chunk/truy xuất ở mức source, nhưng mức độ dùng trong từng câu trả lời cần xác minh.
- Các tính năng billing production: credential provider thật, webhook được xác thực đầy đủ, xử lý retry/idempotency và nghiệm thu thanh toán thật chưa được chứng minh; code hiện ghi rõ sandbox.

## VII. Các lỗi và vấn đề tồn tại

| STT | Vấn đề | Mức độ | Nguyên nhân | Hướng xử lý |
|---:|---|---|---|---|
| 1 | Giá trị mặc định Gemini API key và Cloudinary key/secret xuất hiện trong `HealthAssistantProject/docker-compose.yml`; đồng thời có DB/JWT mặc định yếu | Critical | Compose dùng fallback credential trực tiếp trong repository | Thu hồi/rotate key đã lộ, xóa giá trị thật khỏi file, chỉ dùng secret manager hoặc `.env` ngoài git; đổi DB/JWT production. |
| 2 | Google Login không nhất quán giữa mobile và backend | High | UI/file tích hợp Google đã bỏ nhưng `AuthController` và `GoogleAuthService` còn | Chốt phạm vi sản phẩm, sau đó xóa endpoint/dependency/cấu hình/test hoặc hoàn thiện lại tích hợp có kiểm soát. |
| 3 | Camera/pose chưa hoạt động thật | High | Frontend gửi `demoLandmark`/sample frame | Tích hợp camera/landmark pipeline, kiểm tra permission, chất lượng landmark, timeout và trường hợp độ tin cậy thấp. |
| 4 | Chưa thể chạy backend test và API smoke test | High | Môi trường khảo sát không có `java`/`JAVA_HOME` | Cài JDK tương thích Java 17, chạy `HealthAssistantProject/gradlew.bat test`, sau đó chạy smoke/integration với MySQL. |
| 5 | `npm run lint` thất bại với 86 lỗi và 4 cảnh báo | High | ESLint quét thư mục component Vue cũ/import `.vue`, một số import Expo không resolve và lỗi hook `useDebounce` | Loại thư mục legacy khỏi scope lint hoặc di chuyển/xóa có chủ đích; sửa resolver/import và hook; chạy lint lại. |
| 6 | Signup/reset password ép Gmail trong UI trong khi API nhận email nói chung | Medium | Regex và label trong `Login.tsx` dùng `@gmail.com` | Thống nhất chính sách email với backend và sửa validation/thông báo. |
| 7 | Chưa có kiểm thử E2E mobile → backend → database | Medium | Chỉ có unit test backend và kiểm tra TypeScript tĩnh | Bổ sung môi trường Docker test, seed dữ liệu, test auth/roadmap/meal/workout/progress và kiểm tra tải lại dữ liệu. |
| 8 | Một số hook có cảnh báo dependency; `Workout.tsx` và `useClickOutside.ts` bị ESLint cảnh báo | Low | Dependency array chưa phản ánh đầy đủ callback/state | Chuẩn hóa callback/dependency và kiểm tra lại vòng đời session. |

## VIII. Kết quả kiểm thử

### Đã thực hiện

| Hạng mục | Kết quả | Ý nghĩa |
|---|---|---|
| `npx tsc --noEmit` trong `heathreact/` | Thành công | TypeScript hiện không có lỗi type-check theo cấu hình hiện tại. |
| `npm run lint` trong `heathreact/` | Thất bại: 86 lỗi, 4 cảnh báo | Chưa đạt chất lượng lint; lỗi gồm import không resolve, legacy Vue files và hook. |
| Kiểm kê test Java | 34 file, 104 `@Test` | Có test source ở nhiều module; chưa phải kết quả pass. |
| `HealthAssistantProject/gradlew.bat test` | Không chạy được | Gradle dừng trước khi build vì không tìm thấy `java`/`JAVA_HOME`. |

### Chưa thực hiện được

- Chưa chạy backend unit/integration test, API smoke test hoặc test với MySQL.
- Chưa khởi chạy Expo trên Android/iOS/web để xác minh navigation, UI, loading/error state và upload multipart.
- Chưa gọi Gemini, Cloudinary, Stripe, PayPal, SMTP hoặc Google OAuth bằng credential hợp lệ.
- Chưa xác minh đăng ký OTP, lưu token, tạo lộ trình, tải lại lộ trình sau activate, meal analysis, workout session và daily check-in end-to-end.

## IX. Kế hoạch công việc tiếp theo

1. Thu hồi và thay toàn bộ credential/default secret trong `docker-compose.yml`; kiểm tra lịch sử git và cấu hình triển khai.
2. Cài JDK 17, khởi động MySQL bằng Docker, chạy toàn bộ Gradle test và smoke test; ghi nhận test nào pass/fail thực tế.
3. Sửa scope/config lint, loại phần Vue legacy khỏi ứng dụng React Native hoặc xử lý dứt điểm; giữ `tsc --noEmit` trong CI.
4. Chốt quyết định Google Login và chính sách email, sau đó đồng bộ frontend, backend, dependency và test.
5. Hoàn thiện camera/landmark pipeline thật, quyền camera và kiểm tra confidence trước khi đưa posture/workout ra sử dụng.
6. Kiểm thử E2E luồng cốt lõi: auth/OTP → profile → đặt tên và tạo preview → activate → lịch/tiến độ; tiếp theo là meal analysis và activity session.
7. Kiểm tra AI với các nhánh key thiếu, timeout, lỗi HTTP, JSON sai schema; bảo đảm fallback được gắn nhãn và không bị hiểu là kết quả AI thật.
8. Bổ sung notification nếu nằm trong phạm vi sản phẩm; nếu chưa nằm trong phạm vi, ghi rõ trong tài liệu phát hành.
9. Sau khi luồng cốt lõi ổn định, nghiệm thu billing sandbox rồi mới cấu hình provider production và webhook/idempotency.

## X. Kết luận

Health Assistant đã vượt qua giai đoạn dựng giao diện mẫu: backend có kiến trúc module tương đối đầy đủ, mobile có nhiều màn hình và service API, AI có client/fallback, còn lộ trình, hồ sơ, progress, nutrition, workout, coach và billing đều có dấu vết triển khai thực tế trong source. Tuy nhiên trạng thái hiện tại là **đang phát triển và chưa được xác minh vận hành đầu-cuối**. Không có cơ sở để công bố tỷ lệ hoàn thành hoặc kết quả API pass trong môi trường khảo sát.

Ưu tiên trước mắt là xử lý secrets, tạo môi trường chạy được backend, xác minh các luồng auth/roadmap/progress, sửa lint, rồi mới nghiệm thu AI và camera. Các chức năng chưa có bằng chứng triển khai, đặc biệt notification và camera thật, không nên đánh dấu hoàn thành chỉ dựa trên việc đã có màn hình hoặc endpoint.

