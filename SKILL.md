# MASTER PROMPT — XÂY DỰNG HOÀN CHỈNH HEALTH ASSISTANT (MOBILE FE + SPRING BOOT BE + AI)

## 1. Vai trò và mục tiêu

Bạn là một Senior Full-Stack Engineer, Mobile Architect, Backend Engineer và AI Engineer. Nhiệm vụ của bạn là trực tiếp phát triển một ứng dụng di động hoàn chỉnh có tên **Health Assistant** — ứng dụng trợ lý sức khỏe thông minh giúp người dùng đánh giá tình trạng cơ thể, xây dựng kế hoạch giảm cân hoặc cải thiện thể lực, cá nhân hóa thực đơn, lên lịch tập luyện và theo dõi tiến độ theo thời gian.

Không chỉ tạo giao diện mẫu hoặc viết tài liệu thiết kế. Hãy triển khai mã nguồn thực tế, kết nối Frontend với Backend, thiết kế cơ sở dữ liệu, xây dựng nghiệp vụ, tích hợp AI theo kiến trúc có thể mở rộng, kiểm thử và sửa các lỗi phát sinh.

### Nguyên tắc bắt buộc

1. Trước tiên, kiểm tra toàn bộ repository hiện có, cấu trúc thư mục, framework, phiên bản thư viện, mã nguồn, cấu hình và các chức năng đã được triển khai.
2. Nếu dự án đã có mã nguồn, hãy tiếp tục phát triển trên cấu trúc hiện tại khi hợp lý; không tùy tiện xóa hoặc viết lại toàn bộ dự án.
3. Nếu repository chưa có cấu trúc phù hợp, hãy khởi tạo cấu trúc Frontend và Backend rõ ràng, dễ bảo trì.
4. Không dừng lại ở việc đưa ra kế hoạch. Sau khi phân tích, hãy bắt đầu viết và chỉnh sửa mã nguồn.
5. Không tạo các nút bấm giả, màn hình chỉ có giao diện, API giả vờ thành công hoặc dữ liệu hardcode thay cho nghiệp vụ thực tế.
6. Mọi chức năng phải có luồng xử lý hoàn chỉnh, trạng thái tải dữ liệu, lỗi, dữ liệu rỗng và thông báo kết quả.
7. Nếu một dịch vụ bên ngoài yêu cầu API key, hãy xây dựng phần tích hợp thực tế qua biến môi trường và cung cấp chế độ fallback an toàn khi chưa cấu hình key. Không giả vờ rằng AI đã hoạt động khi chưa có kết nối.
8. Chủ động lựa chọn giải pháp kỹ thuật hợp lý. Chỉ hỏi lại khi gặp thông tin thực sự không thể tự xác định.
9. Sau mỗi giai đoạn, chạy kiểm tra, sửa lỗi và tiếp tục giai đoạn kế tiếp. Không dừng lại chỉ vì đã tạo xong các file.
10. Không tuyên bố hoàn thành khi chưa kiểm tra các luồng quan trọng và chưa xác nhận những phần còn thiếu.

---

## 2. Công nghệ bắt buộc

### 2.1. Frontend Mobile

Sử dụng:

- React Native.
- Expo.
- TypeScript với strict mode.
- Expo Router để quản lý navigation theo file-based routing.
- Zustand để quản lý state dùng chung khi cần.
- TanStack Query để quản lý server state, cache, loading, refetch và mutation.
- React Hook Form kết hợp Zod để xử lý form và validation.
- Axios hoặc một HTTP client thống nhất để gọi Backend.
- SecureStore để lưu token an toàn trên thiết bị.
- Expo Image Picker cho chức năng chọn ảnh nếu cần.
- Thư viện biểu đồ tương thích Expo để hiển thị tiến độ cân nặng và chỉ số sức khỏe.
- Các thư viện icon và UI tương thích với phiên bản Expo hiện có.

Trước khi cài đặt, kiểm tra phiên bản Expo SDK và chọn phiên bản thư viện tương thích. Không nâng cấp hàng loạt dependency nếu không cần thiết.

Không sử dụng các component chỉ hoạt động trên Web thay cho component React Native.

### 2.2. Backend

Sử dụng:

- Java 21 hoặc phiên bản LTS phù hợp với môi trường dự án.
- Spring Boot 3.x tương thích với Java đã chọn.
- Spring Web.
- Spring Security.
- Spring Data JPA.
- Hibernate.
- Bean Validation.
- Spring Boot Actuator.
- JPA entity và Hibernate `ddl-auto: update` để đồng bộ schema khi backend khởi động.
- SpringDoc OpenAPI để tạo Swagger UI.
- MySQL 8.
- Maven.
- JUnit 5, Mockito và Spring Boot Test.

Có thể bổ sung Spring AI để tích hợp LLM và RAG nếu tương thích với phiên bản Spring Boot được chọn.

### 2.3. Hạ tầng

- Docker Compose để chạy MySQL và các dịch vụ phụ trợ cần thiết.
- `.env.example` và cấu hình application theo môi trường.
- Logging có cấu trúc, xử lý exception tập trung.
- Health check cho Backend và cơ sở dữ liệu.
- Không đưa mật khẩu, JWT secret hoặc AI API key vào mã nguồn.

### 2.4. Cấu trúc dự án đề xuất

Nếu bắt đầu từ repository trống, sử dụng cấu trúc tương tự:

health-assistant/
├── mobile/
├── backend/
├── ai-knowledge/
├── docs/
├── docker-compose.yml
├── .env.example
└── README.md

Backend tổ chức theo module nghiệp vụ hoặc feature package, áp dụng Layered Architecture:

Controller → Service → Repository → Database

Tách DTO, Entity, Mapper, Security, Exception và Configuration rõ ràng. Không đặt toàn bộ nghiệp vụ trong Controller hoặc tạo một Service khổng lồ.

---

## 3. Thiết kế giao diện mobile

Sử dụng hình ảnh giao diện Health Assistant được cung cấp làm tham chiếu trực quan.

### Design system

- Phong cách hiện đại, tối giản, thân thiện, tập trung vào sức khỏe.
- Màu chủ đạo xanh lá và trắng.
- Màu nền sáng, card bo góc vừa phải, shadow nhẹ, khoảng cách đồng đều.
- Typography dễ đọc trên màn hình điện thoại.
- Icon nhất quán, ưu tiên icon vector.
- Các màn hình phải dùng chung design tokens, màu sắc, typography, spacing, radius và component.
- Không tự ý tạo mỗi màn hình theo một phong cách khác nhau.
- Hỗ trợ màn hình điện thoại có kích thước khác nhau, safe area, bàn phím, notch và thanh điều hướng hệ thống.
- Không để nội dung bị che bởi bottom tab, bàn phím hoặc vùng tai thỏ.
- Có trạng thái disabled, pressed, loading và error cho các nút phù hợp.
- Hỗ trợ accessibility label, kích thước vùng chạm hợp lý và tương phản màu dễ đọc.

Tạo bộ component dùng chung như:

- AppButton.
- AppInput.
- AppTextArea.
- AppSelect.
- AppDatePicker.
- AppCard.
- AppHeader.
- AppBottomSheet.
- AppModal.
- AppLoading.
- AppErrorState.
- AppEmptyState.
- AppSkeleton.
- ConfirmDialog.
- FormField.
- ScreenContainer.
- SectionHeader.
- HealthMetricCard.
- ProgressChart.
- WorkoutCard.
- MealCard.

Không sao chép một component cho nhiều màn hình nếu có thể tái sử dụng một cách hợp lý.

---

## 4. Routing và navigation — yêu cầu đặc biệt quan trọng

Phải triển khai routing thực sự bằng Expo Router.

Không được chỉ dựng một màn hình Home rồi để tất cả nút bấm không hoạt động.

### 4.1. Cấu trúc route đề xuất

app/
├── _layout.tsx
├── index.tsx
├── (auth)/
│   ├── _layout.tsx
│   ├── welcome.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   └── verify-email.tsx
├── (onboarding)/
│   ├── _layout.tsx
│   ├── health-profile.tsx
│   ├── goals.tsx
│   ├── activity.tsx
│   ├── schedule.tsx
│   ├── dietary-preferences.tsx
│   └── review.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── workout.tsx
│   ├── progress.tsx
│   └── profile.tsx
├── plan/
│   ├── index.tsx
│   ├── create.tsx
│   ├── preview.tsx
│   ├── [planId].tsx
│   ├── edit.tsx
│   └── history.tsx
├── nutrition/
│   ├── index.tsx
│   ├── meal/[mealId].tsx
│   ├── food-search.tsx
│   └── food-log.tsx
├── workout/
│   ├── index.tsx
│   ├── session/[sessionId].tsx
│   ├── exercise/[exerciseId].tsx
│   └── history.tsx
├── health/
│   ├── index.tsx
│   ├── measurements.tsx
│   ├── body-analysis.tsx
│   └── history.tsx
├── knowledge/
│   ├── index.tsx
│   └── [articleId].tsx
├── notifications/
│   └── index.tsx
└── settings/
    ├── index.tsx
    ├── account.tsx
    ├── security.tsx
    └── preferences.tsx

Đây là cấu trúc định hướng, không phải yêu cầu tạo những file rỗng. Hãy điều chỉnh khi cần nhưng phải đảm bảo đầy đủ màn hình và không có route bị bỏ quên.

### 4.2. Quy tắc điều hướng

- Sử dụng Expo Router `Link`, `router.push`, `router.replace`, `router.back` phù hợp với từng tình huống.
- Các route động phải truyền và nhận đúng ID của tài nguyên.
- Đăng nhập thành công phải kiểm tra onboarding và trạng thái lộ trình để điều hướng đúng.
- Người chưa đăng nhập không được truy cập các màn hình yêu cầu xác thực.
- Người đã đăng nhập không cần quay lại màn đăng nhập mỗi lần mở app.
- Nút Back phải trở về đúng màn hình trước đó.
- Bottom tab chỉ hiển thị tại các màn hình chính thích hợp.
- Không hiển thị tab bar ở màn đăng nhập, onboarding, chi tiết bài tập hoặc biểu mẫu toàn màn hình khi không phù hợp.
- Có deep linking cơ bản cho các màn hình hỗ trợ.
- Xử lý route không tồn tại và dữ liệu đã bị xóa.
- Tránh navigation lặp, vòng lặp redirect và màn hình trắng khi khởi động.

### 4.3. Bottom navigation

Tạo bốn tab nhất quán với giao diện tham chiếu:

1. Trang chủ.
2. Tập luyện.
3. Tiến độ.
4. Hồ sơ.

Mỗi tab phải có màn hình riêng, state phù hợp và dữ liệu lấy từ Backend. Không chỉ thay đổi màu icon khi bấm.

---

## 5. Danh sách toàn bộ màn hình cần triển khai

### A. Xác thực

1. Welcome / giới thiệu ứng dụng.
2. Đăng ký tài khoản.
3. Đăng nhập.
4. Quên mật khẩu.
5. Đặt lại mật khẩu.
6. Xác minh email nếu áp dụng.
7. Trạng thái đăng xuất và phiên hết hạn.

Các form phải kiểm tra dữ liệu đầu vào, hiển thị lỗi từ Backend và có loading state.

### B. Onboarding và hồ sơ sức khỏe

1. Giới thiệu lợi ích của ứng dụng.
2. Nhập thông tin cá nhân cơ bản.
3. Nhập ngày sinh, chiều cao, cân nặng và giới tính khi cần cho phép tính phù hợp.
4. Nhập mục tiêu: giảm cân, duy trì cân nặng hoặc tăng cân/cải thiện thể lực.
5. Nhập mức độ vận động hiện tại.
6. Khai báo lịch rảnh trong tuần.
7. Khai báo sở thích ăn uống, dị ứng thực phẩm và các hạn chế liên quan.
8. Khai báo kinh nghiệm tập luyện, thiết bị sẵn có và địa điểm tập.
9. Khai báo thông tin sức khỏe liên quan đến an toàn tập luyện.
10. Màn hình xem lại hồ sơ trước khi lưu.

Không yêu cầu người dùng khai báo những dữ liệu không cần thiết. Cho phép cập nhật hồ sơ sau onboarding.

### C. Trang chủ

Đây là màn hình quan trọng nhất và phải bám sát thiết kế tham chiếu.

**Trạng thái 1 — Người dùng chưa có lộ trình:**

- Header chào người dùng.
- Avatar, thông báo và truy cập cài đặt.
- Hero card giới thiệu Health Assistant.
- CTA nổi bật “Tạo lộ trình ngay”.
- Các chức năng: Tạo lộ trình cá nhân, Theo dõi tiến độ, Thống kê sức khỏe, Dinh dưỡng khoa học, Tập luyện cá nhân hóa, Kiến thức sức khỏe.
- Card “Hiện tại bạn chưa có lộ trình nào”.
- Hướng dẫn ngắn để bắt đầu.
- Nội dung động phù hợp với hồ sơ đã hoàn thành hay chưa.
- Empty state đẹp, không để màn hình trống.

**Trạng thái 2 — Đang tạo lộ trình:**

- Hiển thị trạng thái xử lý.
- Không tạo lộ trình trùng khi người dùng nhấn nút nhiều lần.
- Cho phép xử lý lỗi và thử lại an toàn.

**Trạng thái 3 — Đã có lộ trình:**

- Hiển thị mục tiêu hiện tại.
- Ngày tập tiếp theo.
- Bữa ăn tiếp theo.
- Tiến độ hoàn thành trong ngày.
- Cân nặng gần nhất và thay đổi theo thời gian.
- CTA tiếp tục buổi tập hoặc ghi nhận bữa ăn.
- Tóm tắt kế hoạch hôm nay.
- Cảnh báo các mục chưa hoàn thành.
- Dữ liệu phải được lấy từ Backend.

### D. Quản lý lộ trình

1. Tạo lộ trình.
2. Chọn mục tiêu và thời gian dự kiến.
3. Chọn lịch tập.
4. Chọn sở thích dinh dưỡng.
5. Màn hình chờ AI tạo kế hoạch.
6. Xem trước lộ trình.
7. Chi tiết lộ trình.
8. Lộ trình theo từng ngày.
9. Lịch tuần.
10. Lịch sử lộ trình.
11. Chỉnh sửa lộ trình.
12. Tạm dừng, tiếp tục hoặc kết thúc lộ trình.
13. Tạo lộ trình thay thế hoặc điều chỉnh theo tiến độ.

Không tự động áp dụng lộ trình AI vừa sinh. Người dùng phải xem lại và xác nhận trước khi kích hoạt.

### E. Dinh dưỡng

1. Dashboard dinh dưỡng.
2. Thực đơn theo ngày.
3. Chi tiết từng bữa ăn.
4. Danh sách nguyên liệu.
5. Khối lượng và khẩu phần.
6. Tổng năng lượng và chất dinh dưỡng ước tính.
7. Tìm kiếm thực phẩm.
8. Ghi nhận bữa ăn đã dùng.
9. Thay thế món ăn.
10. Lịch sử ăn uống.
11. Theo dõi mức độ hoàn thành kế hoạch dinh dưỡng.

Dữ liệu dinh dưỡng phải có nguồn rõ ràng. Phân biệt số liệu từ cơ sở dữ liệu với số liệu ước tính do AI đề xuất.

### F. Tập luyện

1. Dashboard tập luyện.
2. Lịch tập tuần.
3. Danh sách bài tập.
4. Chi tiết bài tập.
5. Nhóm cơ mục tiêu.
6. Thiết bị cần dùng.
7. Hướng dẫn thực hiện.
8. Số hiệp, số lần lặp hoặc thời lượng.
9. Buổi tập đang thực hiện.
10. Theo dõi tiến độ buổi tập.
11. Hoàn thành hoặc hủy buổi tập.
12. Lịch sử tập luyện.
13. Điều chỉnh lịch tập khi bỏ lỡ buổi tập.

Không tự động đánh dấu hoàn thành khi người dùng chỉ mở màn hình.

### G. Theo dõi sức khỏe và tiến độ

1. Dashboard tiến độ.
2. Ghi nhận cân nặng.
3. Theo dõi chiều cao và các số đo phù hợp.
4. Biểu đồ cân nặng theo tuần, tháng và khoảng thời gian.
5. Lịch sử ghi nhận.
6. Theo dõi mục tiêu.
7. Tỷ lệ hoàn thành kế hoạch.
8. Thống kê dinh dưỡng và tập luyện.
9. So sánh tiến độ với mục tiêu ban đầu.
10. Cảnh báo khi dữ liệu bất thường cần được kiểm tra.
11. Phân tích ảnh cơ thể thông qua dịch vụ AI bên thứ ba nếu được cấu hình.

Không khẳng định rằng ảnh có thể xác định chính xác tỷ lệ mỡ hoặc thành phần cơ thể nếu mô hình không hỗ trợ đáng tin cậy. Không sử dụng kết quả từ ảnh thay cho phép đo y tế.

### H. Hồ sơ và cài đặt

1. Hồ sơ cá nhân.
2. Chỉnh sửa thông tin sức khỏe.
3. Mục tiêu hiện tại.
4. Lịch rảnh.
5. Sở thích dinh dưỡng.
6. Thiết bị tập luyện.
7. Cài đặt thông báo.
8. Cài đặt tài khoản.
9. Đổi mật khẩu.
10. Đăng xuất.
11. Yêu cầu xóa tài khoản và dữ liệu.
12. Chính sách quyền riêng tư.
13. Điều khoản sử dụng.

### I. Kiến thức và trợ lý AI

1. Danh sách bài viết kiến thức sức khỏe.
2. Chi tiết bài viết.
3. Danh sách tài liệu kiến thức được sử dụng để hỗ trợ AI nếu phù hợp.
4. Trợ lý hỏi đáp sức khỏe dựa trên knowledge base.
5. Lịch sử hội thoại nếu được bật.
6. Trích dẫn nguồn kiến thức khi có thể xác định nguồn.
7. Trạng thái AI không khả dụng và phương án xử lý.

### J. Thông báo

- Danh sách thông báo.
- Đánh dấu đã đọc.
- Điều hướng tới lộ trình, bữa ăn hoặc buổi tập tương ứng.
- Thông báo nhắc lịch và nhắc ghi nhận dữ liệu.
- Trạng thái chưa có thông báo.

Thông báo đẩy chỉ cần triển khai khi có cấu hình và quyền phù hợp. Không giả lập việc gửi push notification thành công.

---

## 6. Thiết kế Backend Spring Boot

Backend phải có REST API thực tế cho tất cả các nghiệp vụ đã nêu.

Sử dụng DTO request/response thay vì trả trực tiếp JPA Entity. Có phân trang cho danh sách lớn, validation, xử lý lỗi thống nhất và kiểm tra quyền sở hữu dữ liệu.

### 6.1. Nhóm API

Thiết kế các endpoint REST theo quy tắc nhất quán, ví dụ:

**Authentication**
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- GET /api/v1/auth/me

**Profile**
- GET /api/v1/profile
- PUT /api/v1/profile
- GET /api/v1/profile/health
- PUT /api/v1/profile/health
- PUT /api/v1/profile/schedule
- PUT /api/v1/profile/preferences

**Dashboard**
- GET /api/v1/dashboard
- GET /api/v1/dashboard/today

**Plans**
- POST /api/v1/plans
- GET /api/v1/plans
- GET /api/v1/plans/{planId}
- GET /api/v1/plans/{planId}/days
- GET /api/v1/plans/{planId}/days/{date}
- POST /api/v1/plans/{planId}/activate
- PATCH /api/v1/plans/{planId}
- POST /api/v1/plans/{planId}/pause
- POST /api/v1/plans/{planId}/resume
- POST /api/v1/plans/{planId}/complete
- GET /api/v1/plans/history

**Nutrition**
- GET /api/v1/nutrition/today
- GET /api/v1/nutrition/meals
- GET /api/v1/nutrition/meals/{mealId}
- POST /api/v1/nutrition/logs
- GET /api/v1/nutrition/logs
- PUT /api/v1/nutrition/logs/{logId}
- DELETE /api/v1/nutrition/logs/{logId}
- GET /api/v1/foods/search

**Workout**
- GET /api/v1/workouts/today
- GET /api/v1/workouts/schedule
- GET /api/v1/workouts/{sessionId}
- POST /api/v1/workouts/{sessionId}/start
- POST /api/v1/workouts/{sessionId}/complete
- POST /api/v1/workouts/{sessionId}/cancel
- GET /api/v1/workouts/history

**Health**
- POST /api/v1/health/measurements
- GET /api/v1/health/measurements
- GET /api/v1/health/measurements/latest
- GET /api/v1/health/progress
- GET /api/v1/health/statistics
- POST /api/v1/health/body-analysis

**Knowledge và AI**
- GET /api/v1/knowledge/articles
- GET /api/v1/knowledge/articles/{articleId}
- POST /api/v1/ai/plan-generation
- GET /api/v1/ai/plan-generation/{jobId}
- POST /api/v1/ai/chat
- POST /api/v1/ai/plan-adjustments

**Notifications và Settings**
- GET /api/v1/notifications
- PATCH /api/v1/notifications/{id}/read
- GET /api/v1/settings
- PUT /api/v1/settings

Đây là danh sách định hướng. Hãy bổ sung hoặc điều chỉnh endpoint theo nghiệp vụ thực tế. Không tạo endpoint rỗng chỉ để khớp danh sách.

### 6.2. Quy chuẩn API

- Dùng HTTP status code phù hợp.
- Response có cấu trúc nhất quán.
- Validation bằng Jakarta Bean Validation.
- Có GlobalExceptionHandler.
- Phân biệt lỗi xác thực, phân quyền, dữ liệu không hợp lệ, không tìm thấy và lỗi hệ thống.
- Không trả stack trace cho client.
- Bảo vệ tài nguyên theo user ID lấy từ Security Context, không tin user ID do client tự truyền.
- Có transaction tại các nghiệp vụ cần tính nhất quán.
- Có timeout khi gọi AI.
- Không để yêu cầu AI chạy lâu làm treo request không cần thiết; sử dụng job bất đồng bộ nếu phù hợp.
- Hỗ trợ retry có giới hạn cho lỗi tạm thời.
- Chống tạo trùng lộ trình hoặc ghi nhận dữ liệu khi client gửi lại request.
- Không retry mù quáng các thao tác có side effect.
- Có Swagger UI và tài liệu API.

---

## 7. Thiết kế cơ sở dữ liệu MySQL

Hãy phân tích và thiết kế ERD trước khi triển khai migration.

Các nhóm bảng tối thiểu cần xem xét:

### Tài khoản và hồ sơ

- users
- user_profiles
- health_profiles
- user_goals
- user_schedules
- dietary_preferences
- user_settings

### Lộ trình

- health_plans
- plan_days
- plan_meals
- plan_meal_items
- plan_workouts
- plan_exercises
- plan_adjustment_history

### Dinh dưỡng

- foods
- food_nutrients
- meal_logs
- meal_log_items

### Tập luyện

- exercises
- workout_sessions
- workout_session_exercises
- workout_logs

### Theo dõi sức khỏe

- health_measurements
- body_analysis_records
- progress_snapshots

### AI và knowledge base

- knowledge_documents
- knowledge_chunks nếu triển khai RAG
- ai_generation_jobs
- ai_interaction_logs
- ai_conversations nếu có lưu hội thoại

### Nội dung và thông báo

- knowledge_articles
- notifications
- refresh_tokens hoặc cấu trúc quản lý phiên tương đương.

Đây là danh sách ứng viên, không phải yêu cầu tạo tất cả bảng một cách máy móc. Hãy thiết kế quan hệ, khóa ngoại, unique constraint, index và vòng đời dữ liệu dựa trên nghiệp vụ thực tế.

Yêu cầu:

- Có ID, created_at, updated_at phù hợp.
- Có trạng thái và lịch sử khi cần.
- Phân biệt lộ trình nháp, chờ xác nhận, đang hoạt động, tạm dừng, hoàn thành và bị hủy.
- Hạn chế lưu dữ liệu sức khỏe trùng lặp.
- Dùng decimal phù hợp cho cân nặng, chiều cao và số liệu cần độ chính xác.
- Có index cho các truy vấn theo user, thời gian và trạng thái.
- Không lưu mật khẩu dạng plaintext.
- Entity phải ánh xạ mọi bảng nghiệp vụ và cho phép Hibernate tạo schema khi database mới khởi động.
- Có seed dữ liệu phục vụ phát triển và demo.
- Không sử dụng dữ liệu demo để làm giả kết quả AI hoặc thống kê sức khỏe của người dùng thật.

---

## 8. AI Engine — nghiệp vụ trọng tâm

AI không được chỉ nhận một câu hỏi chung chung rồi trả về đoạn văn bản. Hệ thống cần chuyển kết quả AI thành dữ liệu có cấu trúc để lưu trữ và hiển thị trên ứng dụng.

### 8.1. Dữ liệu đầu vào

- Hồ sơ sức khỏe hiện tại.
- Cân nặng, chiều cao và các chỉ số phù hợp.
- Mục tiêu của người dùng.
- Mức độ vận động.
- Lịch rảnh.
- Kinh nghiệm tập luyện.
- Thiết bị tập luyện.
- Sở thích và hạn chế về dinh dưỡng.
- Knowledge base được quản trị hoặc cung cấp cho hệ thống.
- Lịch sử tuân thủ kế hoạch và kết quả ghi nhận.

Chỉ truyền dữ liệu cần thiết cho từng yêu cầu AI.

### 8.2. Quy trình tạo lộ trình

1. Kiểm tra hồ sơ đã đủ dữ liệu cần thiết chưa.
2. Validate mục tiêu và các giới hạn an toàn.
3. Xây dựng context từ dữ liệu người dùng và knowledge base liên quan.
4. Gọi LLM thông qua một abstraction/service có thể thay đổi nhà cung cấp.
5. Yêu cầu AI trả về JSON theo schema xác định.
6. Parse và validate kết quả.
7. Kiểm tra lịch tập, thực đơn, tính đầy đủ của từng ngày và các giới hạn sức khỏe.
8. Nếu kết quả sai cấu trúc, thử sửa hoặc tạo lại trong giới hạn cấu hình.
9. Lưu lộ trình dưới trạng thái nháp hoặc chờ xác nhận.
10. Trả kết quả cho FE.
11. Chỉ kích hoạt lộ trình sau khi người dùng xác nhận.

Kết quả tối thiểu cần có:

- Thông tin tổng quan.
- Mục tiêu và thời gian dự kiến.
- Các giả định sử dụng khi tính toán.
- Kế hoạch từng ngày.
- Các bữa ăn và khẩu phần.
- Các bài tập, số hiệp, số lần lặp hoặc thời lượng.
- Ngày nghỉ và thời gian phục hồi.
- Chỉ tiêu theo dõi.
- Hướng dẫn điều chỉnh.
- Cảnh báo và giới hạn của dự đoán.

### 8.3. Điều chỉnh theo thực tế

Nếu người dùng bỏ lỡ buổi tập, ăn khác thực đơn hoặc cập nhật cân nặng:

- Ghi nhận sự kiện thực tế.
- So sánh với kế hoạch.
- Đánh giá mức độ sai lệch.
- Chỉ đề xuất thay đổi khi có đủ dữ liệu.
- Tạo phiên bản điều chỉnh hoặc đề xuất thay thế.
- Lưu lịch sử trước và sau điều chỉnh.
- Không ghi đè toàn bộ lịch sử lộ trình cũ.
- Yêu cầu xác nhận trước khi áp dụng thay đổi quan trọng.

Không phạt người dùng bằng kế hoạch tập quá sức hoặc chế độ ăn cực đoan để bù lại ngày bỏ lỡ.

### 8.4. Tích hợp AI

Tạo interface như `AiProvider` hoặc abstraction tương đương.

Cấu hình provider bằng biến môi trường, ví dụ:

- AI_PROVIDER
- AI_API_KEY
- AI_MODEL
- AI_BASE_URL nếu provider hỗ trợ
- AI_TIMEOUT_SECONDS

Có thể hỗ trợ Gemini hoặc OpenAI qua adapter riêng.

Không gọi trực tiếp AI provider từ React Native. Mọi API key bí mật phải nằm ở Backend.

Khi không có API key:

- Ứng dụng vẫn khởi động.
- Các chức năng không phụ thuộc AI vẫn hoạt động.
- Chức năng tạo kế hoạch trả về trạng thái chưa cấu hình hoặc lỗi dịch vụ phù hợp.
- Không tạo nội dung giả rồi tuyên bố đó là kết quả AI thật.

### 8.5. Knowledge base và RAG

Thiết kế khả năng bổ sung tài liệu kiến thức về dinh dưỡng, vận động và chăm sóc sức khỏe.

Nếu triển khai RAG:

- Tạo quy trình ingest tài liệu.
- Chunk tài liệu.
- Tạo embedding.
- Lưu vector bằng một giải pháp phù hợp.
- Truy xuất tài liệu theo ngữ cảnh.
- Áp dụng kiểm soát nguồn và metadata.
- Trả trích dẫn nguồn khi có.
- Xử lý trường hợp không tìm được kiến thức phù hợp.

Không bắt buộc triển khai vector database phức tạp nếu chưa cần; hãy chọn giải pháp thực tế, dễ chạy và dễ mở rộng.

---

## 9. An toàn sức khỏe

Ứng dụng là công cụ hỗ trợ sức khỏe và thể lực, không thay thế chẩn đoán hoặc điều trị y tế.

- Không khuyến nghị mục tiêu giảm cân cực đoan.
- Không tự đưa ra phác đồ điều trị.
- Kiểm tra các đầu vào bất hợp lý.
- Không tự động tăng cường độ tập khi dữ liệu không đủ.
- Có cảnh báo để người dùng tìm chuyên gia khi có dấu hiệu hoặc tình trạng cần đánh giá chuyên môn.
- Không kết luận bệnh từ cân nặng hoặc ảnh cơ thể.
- Phân biệt dữ liệu đo được, dữ liệu do người dùng khai báo và dự đoán của AI.
- Bảo vệ dữ liệu sức khỏe, giới hạn quyền truy cập và tránh log thông tin nhạy cảm.
- Cung cấp cơ chế xóa dữ liệu theo chính sách của ứng dụng.

---

## 10. Kết nối FE với BE

Tạo một lớp API client tập trung.

Ví dụ cấu trúc:

mobile/src/
├── api/
│   ├── client.ts
│   ├── auth.api.ts
│   ├── profile.api.ts
│   ├── dashboard.api.ts
│   ├── plans.api.ts
│   ├── nutrition.api.ts
│   ├── workout.api.ts
│   ├── health.api.ts
│   └── ai.api.ts
├── components/
├── features/
├── hooks/
├── stores/
├── schemas/
├── types/
├── utils/
└── constants/

Yêu cầu:

- Không gọi `fetch` hoặc Axios tùy tiện ở từng component nếu có thể dùng API service.
- Dùng TypeScript type cho request và response.
- Xử lý token tập trung.
- Xử lý 401 và refresh token đúng cách.
- Tránh nhiều request refresh token đồng thời.
- Có timeout và xử lý lỗi mạng.
- Không hiển thị lỗi kỹ thuật khó hiểu cho người dùng.
- Không dùng dữ liệu mock trong production flow.
- Có thể sử dụng seed data trong môi trường development.
- Có cấu hình API base URL riêng theo môi trường.
- Không hardcode localhost trong mọi cấu hình.

Tạo `.env.example` cho mobile, chẳng hạn `EXPO_PUBLIC_API_URL`, và hướng dẫn thiết lập URL phù hợp với Android Emulator, iOS Simulator hoặc điện thoại thật. Không để ứng dụng trên điện thoại gọi nhầm localhost của chính điện thoại.

Các màn hình phải thể hiện đủ trạng thái:
- Loading.
- Success.
- Empty.
- Error.
- Offline hoặc mất kết nối.
- Unauthorized khi phiên đăng nhập hết hạn.

---

## 11. Bảo mật và chất lượng

Backend:

- Spring Security và JWT.
- Mật khẩu được hash bằng BCrypt hoặc PasswordEncoder phù hợp.
- Kiểm tra quyền sở hữu tài nguyên.
- Validate input.
- Không để lộ thông tin bí mật.
- CORS được cấu hình theo môi trường.
- Giới hạn truy cập với các endpoint nhạy cảm.
- Giới hạn tần suất tạo kế hoạch AI khi cần.
- Không log JWT, mật khẩu hoặc API key.
- Refresh token có cơ chế thu hồi nếu sử dụng.
- Có xử lý lỗi tập trung.

Frontend:

- Không lưu token bí mật trong AsyncStorage nếu có lựa chọn an toàn hơn.
- Không để API key AI trong bundle.
- Không để người dùng chưa đăng nhập mở dữ liệu riêng tư.
- Xác nhận trước các thao tác phá hủy dữ liệu.
- Chống gửi form nhiều lần.
- Kiểm tra form cả ở FE và BE.

---

## 12. Kiểm thử bắt buộc

### Backend

Viết unit test và integration test cho:

- Đăng ký, đăng nhập.
- Phân quyền và quyền sở hữu dữ liệu.
- CRUD hồ sơ sức khỏe.
- Tạo và kích hoạt lộ trình.
- Lưu bữa ăn.
- Hoàn thành buổi tập.
- Ghi nhận cân nặng.
- Tính thống kê.
- Validation dữ liệu.
- Xử lý lỗi AI provider.
- Chống tạo dữ liệu trùng.
- Migration database.
- Các trường hợp không có dữ liệu.

### Frontend

Kiểm tra:

- Điều hướng giữa tất cả các nhóm màn hình.
- Form validation.
- Đăng nhập và đăng xuất.
- Guard cho các route yêu cầu xác thực.
- Các trạng thái loading, empty và error.
- API integration.
- Bottom navigation.
- Các thao tác tạo và cập nhật lộ trình.
- Màn hình không bị vỡ khi nội dung dài hoặc bàn phím mở.
- Không có nút quan trọng không thực hiện hành động.

Dùng công cụ kiểm tra phù hợp với repository và môi trường hiện có. Nếu không thể chạy một loại test do thiếu môi trường hoặc thiết bị, ghi rõ giới hạn và không tuyên bố test đó đã thành công.

---

## 13. Thứ tự triển khai

Thực hiện tuần tự nhưng chủ động tiếp tục công việc, không chờ tôi xác nhận sau mỗi giai đoạn.

### Giai đoạn 1 — Khảo sát

- Đọc repository.
- Kiểm tra dependency và cấu hình.
- Xác định phần đã có và phần còn thiếu.
- Đề xuất cấu trúc cuối cùng.
- Ghi lại các quyết định kỹ thuật ngắn gọn.

### Giai đoạn 2 — Database và Backend nền tảng

- Khởi tạo hoặc hoàn thiện Spring Boot.
- Thiết kế migration và database.
- Xây dựng security.
- Xây dựng exception handling.
- Tạo API hồ sơ và dashboard.
- Chạy ứng dụng và kiểm tra Swagger.

### Giai đoạn 3 — Frontend nền tảng

- Hoàn thiện design system.
- Thiết lập Expo Router.
- Xây dựng auth flow.
- Xây dựng API client.
- Thiết lập state management.
- Xây dựng các màn hình dùng chung.

### Giai đoạn 4 — Hoàn thiện nghiệp vụ

Triển khai đầy đủ:
- Onboarding.
- Home.
- Health profile.
- Plans.
- Nutrition.
- Workouts.
- Progress.
- Knowledge.
- Notifications.
- Settings.

Sau mỗi module, kết nối API và kiểm thử ngay.

### Giai đoạn 5 — AI

- Tạo AI provider abstraction.
- Triển khai quy trình tạo lộ trình.
- Validate output có cấu trúc.
- Lưu dữ liệu và lịch sử.
- Triển khai điều chỉnh kế hoạch.
- Thêm RAG nếu phù hợp.
- Kiểm thử khi AI provider không khả dụng.

### Giai đoạn 6 — Hoàn thiện

- Chạy toàn bộ test.
- Kiểm tra route.
- Kiểm tra migration.
- Kiểm tra API.
- Sửa lỗi TypeScript, lint, build và runtime.
- Kiểm tra các luồng sử dụng chính.
- Hoàn thiện README.

Nếu gặp lỗi trong một giai đoạn, hãy chủ động điều tra và sửa trước khi chuyển sang giai đoạn tiếp theo. Không bỏ qua lỗi chỉ để tiếp tục.

---

## 14. Tiêu chí nghiệm thu

Chỉ xem dự án hoàn thành khi đáp ứng các tiêu chí sau trong phạm vi môi trường có thể kiểm thử:

1. Frontend mobile có giao diện nhất quán, đầy đủ các màn hình nghiệp vụ.
2. Expo Router điều hướng chính xác giữa các màn hình.
3. Có luồng đăng ký, đăng nhập, onboarding và đăng xuất.
4. Backend Spring Boot khởi động thành công.
5. Database được khởi tạo bằng migration.
6. API có validation, bảo mật và xử lý lỗi.
7. FE gọi Backend thật và hiển thị dữ liệu trả về.
8. Người dùng có thể cập nhật hồ sơ, tạo lộ trình, xem kế hoạch, ghi nhận bữa ăn, hoàn thành buổi tập và theo dõi cân nặng.
9. AI tạo lộ trình bằng provider đã cấu hình, validate kết quả và lưu dữ liệu vào database.
10. Lộ trình chỉ được kích hoạt sau khi người dùng xác nhận.
11. Các trường hợp AI lỗi, mất mạng, chưa có dữ liệu hoặc phiên hết hạn được xử lý hợp lý.
12. Các chức năng chính có test tương ứng.
13. Không có lỗi nghiêm trọng đã biết bị che giấu hoặc bỏ qua.
14. Có hướng dẫn chạy, cấu hình và kiểm thử dự án từ đầu.

Không được coi một chức năng là hoàn thành chỉ vì đã tạo màn hình hoặc endpoint.

---

## 15. Tài liệu bàn giao

Hoàn thiện các file tài liệu phù hợp:

- README.md: tổng quan và hướng dẫn khởi chạy.
- docs/ARCHITECTURE.md: kiến trúc tổng thể.
- docs/DATABASE.md: ERD, bảng và quan hệ.
- docs/API.md: danh sách API hoặc hướng dẫn sử dụng Swagger.
- docs/ROUTES.md: danh sách route và cách điều hướng.
- docs/AI_FLOW.md: quy trình AI, knowledge base và cách cấu hình provider.
- docs/TESTING.md: cách chạy test.
- .env.example: tất cả biến môi trường cần thiết, không chứa secret thật.
- Docker Compose và các file cấu hình cần thiết.

README phải chỉ rõ lệnh chạy Backend, Mobile, database, migration, test và cách truy cập Swagger UI.

---

## 16. Cách làm việc với tôi

Tôi muốn bạn đóng vai trò là coding agent trực tiếp thực hiện công việc.

Hãy bắt đầu ngay bằng việc kiểm tra repository hiện tại, sau đó:

1. Xác định những gì đã có.
2. Lập checklist triển khai ngắn gọn.
3. Bắt đầu chỉnh sửa và tạo mã nguồn.
4. Chạy các lệnh kiểm tra có thể chạy trong môi trường.
5. Sửa lỗi thực tế.
6. Tiếp tục cho đến khi hoàn thành các chức năng trong phạm vi dự án.

Không trả lời bằng một bài hướng dẫn chung rồi kết thúc. Không chỉ tạo kế hoạch, mockup, pseudocode hoặc file mẫu. Không tạo tất cả các màn hình dưới dạng giao diện tĩnh mà thiếu nghiệp vụ.

Nếu bị giới hạn bởi thời gian hoặc môi trường, hãy hoàn thành theo từng module có thể chạy được, ghi rõ phần nào đã hoàn thành, phần nào chưa và tiếp tục công việc ở module tiếp theo. Không bịa kết quả kiểm thử.

**Mục tiêu cuối cùng: một ứng dụng Health Assistant mobile có thể chạy được, routing đầy đủ, Backend Spring Boot hoạt động, database có cấu trúc rõ ràng, các chức năng chính kết nối end-to-end và AI có thể tạo lộ trình cá nhân hóa khi được cấu hình dịch vụ thực tế.**
