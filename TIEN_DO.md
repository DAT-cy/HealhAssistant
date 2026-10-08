# Tiến độ Dự án Health Assistant

Ngày cập nhật: 2026-10-08

## Trạng thái tổng quan

| Hạng mục | Trạng thái |
|---|---|
| Backend Spring Boot | ✅ Đã có baseline Auth/Profile/Posture/Roadmap/DailyPlan/Progress/Coach/Workout; chưa compile được (thiếu JDK runtime) |
| App React Native (`heathreact/`) | ✅ 8 màn hình đã nối API baseline; Workout vẫn dùng landmark demo |
| Camera + MediaPipe | Chưa tích hợp (đang gửi landmark demo) |
| Profile / DailyPlan / Progress / Coach API | ✅ Đã có baseline API + frontend; còn nâng cấp AI/trend/chat history |
| Build & test | Chưa chạy được do máy thiếu `java`, `node`, `npm` |
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
- ✅ Profile, posture history, roadmap history, daily plan, progress summary, coach safety chat.
- ⏳ Chưa có daily plan AI, progress trend chi tiết, coach Gemini context/history.

## Phase 5 — Productization

Chưa bắt đầu.

## Cần làm tiếp theo (theo ưu tiên)

1. Cài môi trường: JDK 17+ (`JAVA_HOME`), Node.js + npm → chạy `gradlew test` và `tsc`.
2. Tích hợp MediaPipe Pose cho `Scan` và `Workout` (thay demo landmark).
3. Thêm prompt hỏi mức đau + nút dừng bài luôn thấy trên màn Workout.
4. TTS `vi-VN` cho feedback form.
5. Nâng cấp Daily Plan bằng Gemini và lưu kế hoạch theo ngày.
6. Nâng cấp Progress trend và Coach Chat context/history.
7. Onboarding flags (`profileComplete`, `hasPostureReport`, `hasRoadmap`, `hasTodayPlan`) để dashboard định hướng.
8. Cache offline cho roadmap/daily plan (SQLite / AsyncStorage).

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
