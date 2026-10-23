# Health Assistant - React Native App

App mobile cho dự án Health Assistant, kết nối với backend Spring Boot để cung cấp trải nghiệm AI virtual PT.

## Cấu trúc luồng nghiệp vụ

```text
Home rỗng → Profile + consent → Roadmap preview (3 lựa chọn) → Xác nhận → Home calendar → Daily Plan → Workout → Progress
```

Tài khoản mới bắt đầu ở Home rỗng. Người dùng nhập hồ sơ và consent, xem trước ba lựa chọn, xác nhận một lộ trình; Home đọc lộ trình active để hiển thị lịch. Ngày đã qua không đồng nghĩa buổi tập đã hoàn thành. Ảnh đại diện chỉ để hiển thị, không dùng cho AI. Scan/Workout hiện vẫn dùng landmark demo, chưa phải camera pose pipeline thật.

## Tech Stack

- **Expo** + **TypeScript**
- **Expo Router** với file-based routes và role guards (`ROLE_USER`, `ROLE_ADMIN`)
- **Zustand** cho client state (auth token)
- **TanStack Query** cho cache, loading và refetch dữ liệu backend
- **React Hook Form + Zod** cho validation form
- **Expo SecureStore** cho token JWT
- Design system light indigo/blue: palette, spacing, typography tập trung trong `src/theme/tokens.ts`
- Ảnh fitness `src/assets/images/fitness-home.jpg` tải local từ [Unsplash](https://unsplash.com/photos/a-woman-standing-on-a-block-with-a-pair-of-dumbbells-QBsVExIgTCo); app không tải ảnh hero từ URL runtime.
- Accessibility: live region cho rep count, role button, label rõ ràng

## Endpoint đã khả dụng (backend)

| Endpoint | Method | Chức năng |
|---|---|---|
| `/api/v1/auth/login` | POST | Đăng nhập, trả JWT |
| `/api/v1/auth/profile` | GET | Lấy profile user |
| `/api/v1/posture/assess` | POST | Phân tích tư thế từ landmark |
| `/api/v1/coach/roadmap` | POST | AI tạo roadmap (Gemini hoặc fallback) |
| `/api/v1/coach/roadmap/preview` | POST | Trả ba lựa chọn xem trước, chưa kích hoạt |
| `/api/v1/coach/roadmap/activate` | POST | Xác nhận và kích hoạt lựa chọn |
| `/api/v1/coach/roadmaps/active` | GET | Lấy lộ trình active để Home dựng lịch |
| `/api/v1/coach/roadmaps/me` | GET | Lịch sử lộ trình của user hiện tại |
| `/api/v1/profiles` | POST | Tạo/cập nhật profile |
| `/api/v1/profiles/me` | GET | Lấy profile hiện tại |
| `/api/v1/workout-engine/track` | POST | Theo dõi phase + rep + form feedback |
| `/api/v1/workout-engine/end` | POST | Lưu buổi tập |
| `/api/v1/daily-plans/today` | GET | Kế hoạch hôm nay |
| `/api/v1/progress/summary` | GET | Tổng hợp tiến độ |
| `/api/v1/coach/chat` | POST | Coach safety chat |
| `/api/v1/pose-engine/angle` | POST | Tính góc giữa 3 landmark |

Các endpoint baseline của profile, daily plan, progress, coach chat đã có. Phần AI nâng cao, trend chi tiết và lịch sử chat vẫn đang phát triển.

## Cài đặt

```bash
cd heathreact
nvm use
npm ci
npx expo start
```

The project pins Node.js 22.13.0 in `.nvmrc`; Expo SDK 57/Metro requires a modern Node runtime. In WSL, use Linux Node and Linux-installed dependencies. `npm ci` installs the Linux `lightningcss` binary needed by NativeWind.

Cấu hình backend URL trong file `.env` (có thể sao chép từ `.env.example`):

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8084
```

Giá trị trên dành cho Android Emulator. Với điện thoại thật, thay `10.0.2.2` bằng IPv4 LAN của máy đang chạy backend; với iOS Simulator có thể dùng `localhost`. Chỉ nhập origin và port, không thêm `/api/v1` vì app tự nối path đó. Sau khi sửa `.env`, khởi động lại Expo để nạp cấu hình mới.

Chạy Expo:

```bash
npm start
```

Chọn Android emulator, iOS simulator, hoặc scan QR bằng Expo Go. Trên WSL/Linux, cài dependencies bằng `npm ci` trong Linux trước khi chạy Expo; `node_modules` chứa native binaries của hệ điều hành và không dùng chung được giữa Windows và Linux.

### Cập nhật khi thử trên điện thoại

Để điện thoại nhận ngay các thay đổi mã nguồn, chạy server development qua LAN và quét QR mới trong Expo Go hoặc development build:

```bash
npm run start:mobile
```

Lệnh này xóa Metro cache trước khi chạy. Nút Reload trong app chỉ tải lại bundle từ server development đang được kết nối. Nếu đang dùng APK preview/production đã cài đặt, Reload chỉ mở lại bundle đã đóng gói trong APK; cần tạo và cài bản build mới vì project hiện chưa cấu hình cập nhật OTA.

## Cấu trúc thư mục

```text
app/
  _layout.tsx       # QueryClient, SafeAreaProvider, root stack
  index.tsx         # Điều hướng theo auth state và role
  login.tsx
  (user)/            # Route user: Home, profile, roadmap, workout, progress...
    workout-session.tsx # Bài Squat thử nghiệm landmark, tách khỏi tab Bài tập
  admin/              # Route admin Knowledge Base only
src/
  api/              # HTTP client, types, services
  components/ui/    # Screen, Card, AppButton, Badge, StateViews
  features/
    Auth/pages/     # Login
    Home/pages/     # Dashboard
    Health/pages/   # Profile, Scan, Roadmap, DailyPlan, Workout, Progress, Coach
  hooks/            # useRoadmap, useWorkoutSession
  i18n/             # Chuỗi tiếng Việt tập trung
  routes/           # URL mapping helpers cho Expo Router
  stores/           # Zustand: user, onboarding
  theme/            # tokens.ts
```

Admin được chuyển thẳng tới `/admin/knowledge`; layout route chặn user không phải admin. Các màn hình user nằm trong `(user)` và layout chặn tài khoản admin.

## Quy tắc không được vi phạm

1. **Visibility gate.** Chỉ hiển thị kết quả khi `visibility >= 0.5` và `reliable: true`. Nếu không đủ, hiển thị hướng dẫn chỉnh lại camera.
2. **Không chẩn đoán y khoa.** Không dùng từ chẩn đoán, điều trị, bệnh, chấn thương trong UI.
3. **Đau → dừng bài.** Prompt hỏi mức đau trước/sau bài và nút dừng bài luôn nhìn thấy.
4. **Không gửi ảnh/video cơ thể cho LLM.** Ảnh đại diện chỉ để hiển thị. Nếu bổ sung camera pose, chỉ gửi landmark/feature tối thiểu sau consent và visibility gate.
5. **Không gọi Gemini mỗi frame.** App không gọi model trực tiếp; mọi AI call đi qua backend.
6. **Tiếng Việt là ngôn ngữ chính.** UI, hướng dẫn, feedback form, chuỗi lỗi đều tiếng Việt.
7. **Thiếu dữ liệu thì nói thẳng.** Khi API trả `data: null` hoặc endpoint chưa có, hiển thị trạng thái empty hoặc fallback rõ ràng, không dựng số liệu giả.

## API contract

Chi tiết envelope, error code, status code xem tại:

```text
HealthAssistantProject/.kilo/skills/rn-health-assistant/references/api-contract.md
```

Tóm tắt:

- Mọi response bọc trong `{ statusCode, responseCode, responseMessage, data }`.
- Token JWT gửi qua `Authorization: Bearer <token>`.
- `401` → logout tự động.
- Validation error trả `data: { field: "message" }`.

## Kiểm thử

- Logic hook và service đều có thể test đơn vị: `useRoadmap`, `useWorkoutSession`, `apiClient`.
- Test contract: gọi endpoint thật và xác minh envelope shape.
- Test accessibility: screen reader label, live region, role button.

## Ghi chú triển khai

- Màn hình **Profile**, **DailyPlan**, **Progress**, **Coach chat** đã nối API baseline. Daily Plan/Progress/Coach còn cần nâng cấp AI, trend chi tiết và chat history.
- Màn hình **Scan** và **Workout** dùng landmark demo; kết quả không đại diện cho camera/AI phân tích thật. Cần tích hợp MediaPipe Pose và test fixtures trước khi bật luồng production.
- Rep counting FSM đang chạy ở backend; app chỉ gửi góc và nhận feedback. Không có logic quyết định rep/form trong client.
- Design system: dark mode, palette `#0B0F14`, primary green `#22C55E`, accent sky `#38BDF8`, spacing/radius theo token. Không có giá trị rời rạc hardcode trong component.

## Roadmap tiếp theo

1. Tích hợp MediaPipe Pose cho camera pipeline.
2. TTS tiếng Việt cho feedback real-time.
3. Nâng cấp Daily Plan bằng Gemini, Progress trend và Coach Chat context/history.
4. Test end-to-end với dữ liệu thật.
5. Hoàn thiện pipeline pose camera và luồng đánh giá tư thế sau khi có consent, xử lý dữ liệu và test đáng tin cậy.

---

Để biết thêm về design system, luồng pose pipeline, và quy tắc sản phẩm, xem:

```text
HealthAssistantProject/.kilo/skills/rn-health-assistant/
```
