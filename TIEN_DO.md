# Tiến độ Dự án Health Assistant

Ngày cập nhật: 2026-10-12

## Trạng thái tổng quan

| Hạng mục | Trạng thái |
|---|---|
| Backend Spring Boot | ✅ Baseline Auth/Profile/Posture/Roadmap/DailyPlan/Progress/Coach/Workout; Gemini client chung, roadmap/chat/daily-plan structured output + fallback; chưa compile được (thiếu JDK runtime) |
| App React Native (`heathreact/`) | ✅ Expo SDK 57 / React Native 0.86.3; 8 màn hình API baseline; Login/signup đã nối API, native dùng SecureStore và Web dùng token trong phiên; Profile tải hồ sơ + consent; DailyPlan lưu trạng thái; Workout vẫn dùng landmark demo |
| Camera + MediaPipe | Chưa tích hợp (đang gửi landmark demo) |
| Profile / DailyPlan / Progress / Coach API | ✅ Đã có baseline API + frontend; còn nâng cấp AI/trend/chat history |
| Build & test | TypeScript, Expo Doctor (21/21), Expo dependency check và lint các file đã sửa đều pass; backend test chưa chạy do thiếu JDK/JAVA_HOME; full lint còn lỗi tồn tại ở các file legacy/UI không thuộc lần nâng SDK |
| Docker MySQL | ✅ Đã thêm `docker-compose.yml` + schema/seed SQL; chưa chạy container trong môi trường hiện tại |

## Phase 1 — Nền tảng (phần đã làm)

### Backend đã chỉnh sửa

| File | Thay đổi |
|---|---|
| `src/main/java/health_assistant/config/response/DefaultRes.java` | Constructor 2 tham số không còn bỏ trống `responseCode` |
| `src/main/java/health_assistant/config/exception/GlobalExceptionHandler.java` | Lỗi validation trả envelope `DefaultRes<Map<...>>` thay vì map trần |
| `src/main/java/health_assistant/module/coach/controller/WorkoutEngineController.java` | `@RequestParam(name=...)` tường minh; thêm tham số `sessionId` |
| `src/main/java/health_assistant/module/coach/service/ExerciseRepService.java` | FSM có state, đếm `repetitionCount` thật; phase DOWN/UP/TRANSITION; feedback tiếng Việt; `sessionId` làm khóa state |
| `src/main/java/health_assistant/module/coach/service/GeminiCoachService.java` | Fallback roadmap đủ `weeks` mục, tiếng Việt, `source: 'fallback'` |
| `src/main/java/health_assistant/module/posture/service/PostureAssessmentService.java` | findings / recommendations đều tiếng Việt |
| `module/profile/**` | Profile entity/repository/service/controller |
| `module/posture/entity/PostureReport.java` + repository | Lưu lịch sử scan theo user |
| `module/coach/entity/RoadmapRecord.java` + repository | Lưu roadmap theo user |
| `module/workout/**` | Lưu buổi tập sau `/workout-engine/end` |
| `module/dailyplan/**` | Baseline daily plan profile-based |
| `module/progress/**` | Progress summary từ database |
| `module/coach/dto/CoachChat*.java` | Coach safety chat |
| `src/test/java/.../ExerciseRepServiceTest.java` | ★ mới — 3 test FSM + visibility gate |
| `src/test/java/.../PostureAssessmentServiceTest.java` | ★ mới — test visibility gate |
| `HealthAssistantProject/README.md` | ★ mới — hướng dẫn chạy, endpoint, quy tắc |

### App React Native đã làm trong `heathreact/`

| Nhóm | File | Ghi chú |
|---|---|---|
| Theme | `src/theme/tokens.ts` | palette, spacing, fontSize, radius |
| i18n | `src/i18n/vi.ts` | Chuỗi tiếng Việt, `t()` helper |
| API client | `src/api/client.ts` | `ApiError`, 401 handler, timeout 10s/30s |
| Types | `src/api/types.ts` | `ApiEnvelope`, Posture/Workout/Roadmap |
| Service | `auth.service.ts`, `posture.service.ts`, `coach.service.ts`, `workout.service.ts` | 4 service |
| Hook | `useRoadmap.ts`, `useWorkoutSession.ts` | Tách logic khỏi UI |
| Config | `api.config.ts` | `EXPO_PUBLIC_API_BASE_URL` |
| Auth store | `src/stores/user.ts` | Zustand + SecureStore JWT |
| UI base | `src/components/ui/Screen.tsx`, `Card.tsx`, `AppButton.tsx`, `Badge.tsx`, `SafetyBanner.tsx`, `StateViews.tsx`, `index.ts` | |
| Auth | `src/features/Auth/pages/Login.tsx` | Dark UI, dùng `ApiError`, không hardcode siteUrl |
| Dashboard | `src/features/Home/pages/Home.tsx` | Tổng quan + tab bar |
| Scan | `src/features/Health/pages/Scan.tsx` | `POST /posture/assess`, visibility gate, demo landmark |
| Roadmap | `src/features/Health/pages/Roadmap.tsx` | `POST /coach/roadmap`, badge fallback |
| Workout | `src/features/Health/pages/Workout.tsx` | `POST /workout-engine/track` với `sessionId` |
| Profile / DailyPlan / Progress / Coach | `src/features/Health/pages/*.tsx` | Đã gọi API baseline |
| Navigation | `src/routes/RootNavigator.tsx`, `src/routes/index.ts` | Có `IndexScreen` init auth |
| README | `heathreact/README.md` | Kiến trúc + quy tắc sản phẩm |

## Phase 2 — Roadmap AI (đã làm phần backend)

- `/coach/roadmap` hoạt động với Gemini hoặc fallback an toàn tiếng Việt.
- UI `Roadmap.tsx` đã gọi API thật, hiển thị title/overview/weeklyPlan/safetyNotes.

## Phase 3 — Real-time (mới bắt đầu)

- Backend: `/workout-engine/track` đã có FSM stateful + trả `repetitionCount`.
- App: `Workout.tsx` + `useWorkoutSession` có thể track phase, gửi sample frame.
- Đã thêm lưu workout session; Progress đếm được session.
- Chưa có: camera + MediaPipe, TTS tiếng Việt, cooldown feedback, pose smoothing.

## Phase 4 — Dữ liệu nghiệp vụ (đã có baseline)

- ✅ `user_profiles`, `posture_reports`, `roadmaps`, `workout_sessions`.
- ✅ `daily_plans` lưu duy nhất mỗi user/ngày; `/daily-plans/today` đọc/tạo kế hoạch, `/daily-plans/today/generate` gọi Gemini có consent, schema validation và safety fallback.
- ✅ Profile, posture history, roadmap history, daily plan baseline, progress summary, coach safety chat.
- ✅ Roadmap, coach chat và daily plan có structured Gemini client trong source; chưa chạy API thật do chưa có key/JDK.
- ⏳ Chưa có chat history/RAG và progress trend chi tiết. Schema mới cần được kiểm tra khi khởi động trên DB hiện hữu; Hibernate `ddl-auto:update` có thể tạo bảng, còn SQL init chỉ chạy lần đầu tạo volume.

## Phase 5 — Productization

Chưa bắt đầu.

## Cần làm tiếp theo (theo ưu tiên)

1. Cài môi trường: JDK 17+ (`JAVA_HOME`), Node.js + npm → chạy `gradlew test` và `tsc`.
2. Tích hợp MediaPipe Pose cho `Scan` và `Workout` (thay demo landmark).
3. Thêm prompt hỏi mức đau + nút dừng bài luôn thấy trên màn Workout.
4. TTS `vi-VN` cho feedback form.
5. Cấu hình Gemini key, chạy test và kiểm chứng roadmap/chat/daily plan thật cùng timeout, quota, JSON sai và safety fallback.
6. Nâng cấp Progress trend và Coach Chat context/history.
7. Onboarding flags (`profileComplete`, `hasPostureReport`, `hasRoadmap`, `hasTodayPlan`) để dashboard định hướng.
8. Cache offline cho roadmap/daily plan (SQLite / AsyncStorage).

## Cập nhật triển khai ngày 2026-10-12

- `daily_plans`: thêm entity/repository, lưu JSON activities/safety notes và unique key `(user_id, plan_date)`.
- Gemini client chung gửi key qua header, áp timeout, JSON schema và không ghi prompt/key vào log.
- Roadmap/chat/daily plan được validate trước khi trả/lưu; có fallback và safety gate khi profile báo vùng đau.
- `GET /api/v1/daily-plans/today` gọi AI lần đầu khi có consent/key; `POST /api/v1/daily-plans/today/generate` yêu cầu tạo lại.
- Mobile DailyPlan phân biệt kế hoạch AI, mẫu, fallback và safety-rule; có nút tạo bằng AI.
- Unit test nguồn cho schema/safety/fallback; chưa chạy được vì thiếu JDK/JAVA_HOME.
- Chưa chạy test/build: môi trường hiện thiếu JDK và dependencies npm. Cần kiểm tra cùng MySQL mới và database/volume đã tồn tại.

## Nâng cấp Expo SDK 57 ngày 2026-10-12

- Đồng bộ Expo 57.0.27, React Native 0.86.3, React 19.2.3 và native packages bằng `expo install --fix`.
- Cập nhật EAS build Node lên 22.13.0; sửa app config không còn hợp lệ và thêm `@types/node` cho Expo public env.
- `expo install --check`, `expo-doctor` (21/21), `tsc --noEmit`, lint các file thay đổi: pass.
- Metro chạy chế độ LAN tại `exp://192.168.1.3:8081`; `.env` local trỏ API backend tới `http://192.168.1.3:8080` cho thiết bị cùng Wi-Fi.
- Đã gọi thử `GET /api/v1/progress/summary` qua LAN và nhận HTTP 401 như dự kiến khi chưa có JWT, xác nhận backend reachable; chưa xác minh đăng nhập trên app.
- Expo Go iOS cần tài khoản đăng nhập trên cả app và Expo CLI theo phiên bản hiện tại.

## AI backend ngày 2026-10-12

- Thêm `GeminiClient` dùng `x-goog-api-key`, timeout, JSON schema và không đưa key vào URL/log.
- Roadmap yêu cầu đúng số tuần, kiểm tra field/độ dài và fallback an toàn.
- Coach chat dùng profile context tối thiểu khi consent còn hiệu lực; safety rule chặn nội dung đau/khó thở trước khi gọi AI.
- Daily plan có endpoint `POST /api/v1/daily-plans/today/generate`, schema validation, lưu theo user/ngày; hồ sơ có vùng đau sẽ nhận safety plan không gọi AI.
- Model mặc định `gemini-3.8-flash`. Đặt key trong `HealthAssistantProject/.env` từ `.env.example`; `.env` bị gitignore.
- Unit test nguồn đã thêm cho validation/safety/fallback nhưng chưa chạy: máy thiếu JDK/JAVA_HOME. Chưa gọi Gemini thật vì chưa có key.
- Login API và CORS đã kiểm tra bằng tài khoản demo: HTTP 200; Web SecureStore shim không hỗ trợ nên token chuyển sang memory trong phiên, native vẫn dùng SecureStore.
- Đã nối `POST /auth/signup` vào màn Login; yêu cầu email Gmail theo validation hiện hữu ở backend và tự đăng nhập sau khi đăng ký.
- Cloudinary signed upload cho ảnh đại diện: app chọn JPEG/PNG, backend kiểm tra MIME/kích thước/pixel rồi upload với credential server-side; ảnh URL lưu vào user profile. Không upload ảnh scan/video.
- `.env` local chứa cấu hình Cloudinary và được gitignore. API Secret đã từng được gửi trong chat; cần rotate, cập nhật secret mới vào file local rồi restart backend trước khi test upload thật.
- Đã kiểm tra `npx expo export --platform web`: Web bundle export thành công.

## Docker MySQL — đã hoàn thành

- `HealthAssistantProject/docker-compose.yml`: MySQL 8.0, volume `mysql-data`, healthcheck, UTF-8.
- `HealthAssistantProject/db/init/01_schema.sql`: tạo database `health_assistant` và bảng `tbl_users`.
- `HealthAssistantProject/db/init/02_seed.sql`: ghi chú dữ liệu tài khoản mặc định; app tự tạo BCrypt user khi khởi động.
- `application-local.yml` và `application-dev.yml`: DB URL/user/password đọc từ biến môi trường, mặc định local Docker.
- `HealthAssistantProject/.env.example`: biến cấu hình Docker/Spring/Gemini mẫu.

Lệnh chạy:

```powershell
cd "D:\Do An Heath React\HealthAssistantProject"
docker compose up -d mysql
$env:SPRING_PROFILES_ACTIVE = "local"
.\gradlew.bat bootRun
```

Tài khoản app tự tạo khi database trống: `admin/admin`, `user/user`. Không chạy `docker compose down -v` nếu muốn giữ dữ liệu.

## Quy tắc không được vi phạm (từ skill + Business.md)

1. Visibility gate: chỉ hiển thị kết quả khi `visibility >= 0.5` và `reliable: true`.
2. Không dùng từ chẩn đoán/điều trị/bệnh/chấn thương trong UI.
3. Đau → dừng bài + hỏi mức đau trước/sau.
4. Không gửi video thô — chỉ landmark.
5. Camera loop/Rep counting chạy được offline.
6. Tiếng Việt là ngôn ngữ chính của UI.
7. Thiếu dữ liệu → nói thẳng, không dựng số liệu giả.
8. Không hardcode URL production, secret, magic number ngưỡng.

## Lệnh kiểm chứng (khi có môi trường)

```powershell
cd "D:\Do An Heath React\HealthAssistantProject"
.\gradlew.bat test

cd "D:\Do An Heath React\heathreact"
npx tsc --noEmit
npm start
```

## Roadmap preview, activation va Home calendar - 2026-10-12

- Home khong con hien workout/progress mock cho tai khoan moi; khi chua co lộ trình active, hien empty state va CTA den Profile/Roadmap.
- Profile nhan restrictions va pain areas cung muc tieu, activity level, tuoi, chieu cao, can nang; consent va chieu cao/can nang duoc yeu cau truoc khi preview.
- `POST /api/v1/coach/roadmap/preview` tra ve 3 phuong an AI/fallback, khong ghi active roadmap. `POST /api/v1/coach/roadmap/activate` chi luu lua chon sau khi xac nhan; roadmap cu duoc archive.
- `GET /api/v1/coach/roadmaps/active` duoc Home dung de hien lich tung ngay theo thoi luong da chon; neu chua co du lieu, Home hien trang rong thay vi so lieu gia.
- Anh Cloudinary hien tai la avatar, khong duoc gui Gemini de suy doan suc khoe. AI dung cac so do va thong tin co cau truc; posture scan bang camera la luong rieng.
- Mobile `tsc --noEmit`, lint cac file thay doi, va Expo web export deu pass. Backend tests chua chay duoc tren may hien tai vi chua cai JDK/JAVA_HOME.
