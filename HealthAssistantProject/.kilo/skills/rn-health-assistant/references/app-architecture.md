# App Architecture (React Native)

## Stack đề xuất

Chọn và xác nhận phiên bản thực tế trước khi cài. Không thêm thư viện chưa có trong `package.json`.

| Nhu cầu | Lựa chọn chính | Ghi chú |
|---|---|---|
| Framework | Expo SDK mới nhất tương thích RN | Dễ build Android/iOS, hỗ trợ camera và dev client |
| Ngôn ngữ | TypeScript, `strict: true` | Bắt buộc |
| Navigation | Expo Router (file-based) | Bật `typedRoutes` để có type cho route params |
| Server state | TanStack Query | Cache, retry, refetch, trạng thái loading/error chuẩn hoá |
| Client state | Zustand | Nhẹ, phù hợp cho auth + onboarding flags |
| Token storage | expo-secure-store | Không dùng AsyncStorage cho JWT |
| HTTP | fetch native hoặc axios | Bọc trong một `apiClient` duy nhất |
| Camera | expo-camera hoặc react-native-vision-camera | VisionCamera nhanh hơn cho pose real-time |
| Pose | @mediapipe/tasks-vision | Chạy trong frame processor hoặc worklet |
| TTS | expo-speech | Cần voice `vi-VN` |
| Lưu trữ offline | expo-sqlite hoặc MMKV | Cho cache plan và rep history |
| Test | jest + @testing-library/react-native | Test logic hook/service, không snapshot dồn |

Nếu dự án không dùng Expo, giữ nguyên stack hiện có và chỉ mượn cấu trúc thư mục + nguyên tắc tầng bên dưới.

## Cấu trúc thư mục

```text
mobile/
├── app/                              # route (Expo Router)
│   ├── _layout.tsx                   # root layout: providers, auth gate
│   ├── index.tsx                     # redirect theo trạng thái auth
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (app)/
│       ├── _layout.tsx               # tab + stack
│       ├── onboarding.tsx            # profile
│       ├── scan.tsx                  # posture scan
│       ├── roadmap.tsx
│       ├── daily-plan.tsx
│       ├── workout.tsx                # camera + rep
│       ├── progress.tsx
│       └── coach.tsx                 # chat
├── src/
│   ├── api/
│   │   ├── client.ts                 # fetch wrapper, envelope unwrap, 401 handler
│   │   ├── endpoints.ts              # hằng số path
│   │   ├── types.ts                  # TS types từ api-contract
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── posture.service.ts
│   │       ├── poseEngine.service.ts
│   │       ├── workout.service.ts
│   │       └── coach.service.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePostureAssess.ts
│   │   ├── useRoadmap.ts
│   │   └── useWorkoutSession.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── onboardingStore.ts        # profileComplete, hasRoadmap...
│   ├── features/                     # component + hook riêng theo màn hình
│   │   ├── scan/
│   │   ├── workout/
│   │   └── roadmap/
│   ├── components/                   # component dùng chung, theo design system
│   ├── pose/                         # camera, smoothing, FSM, rep counter
│   ├── config/
│   │   ├── env.ts                    # base URL, feature flags
│   │   └── thresholds.ts             # ngưỡng, chú thích nguồn từ backend
│   ├── theme/
│   │   ├── tokens.ts
│   │   └── ThemeProvider.tsx
│   ├── i18n/
│   │   ├── vi.ts                     # toàn bộ chuỗi tiếng Việt
│   │   └── index.ts
│   └── utils/
│       ├── landmarks.ts              # map MediaPipe → Point3D
│       └── errors.ts                 # parse envelope lỗi
└── __tests__/
```

Quy tắc: `app/` chỉ chứa route mỏng. Business logic nằm ở `src/features` hoặc `src/hooks`.

## Data layer

### apiClient

Một module duy nhất chịu trách nhiệm:

1. Ghép `baseUrl` + path.
2. Gắn `Authorization: Bearer <token>` nếu có.
3. Timeout bằng `AbortController` (10s cho request thường, 30s cho AI call).
4. Parse `ApiEnvelope<T>`.
5. Nếu `statusCode` lỗi → ném `ApiError` với `status`, `responseCode`, `message`, `validationErrors`.
6. Nếu `statusCode === 401` → gọi `authStore.clearSession()` đúng một lần, không lặp lại.
7. Điều hướng lỗi mạng (timeout, offline) thành `ApiError` với `kind: 'network'`.

Không có logic nào khác được nhét vào đây.

### Query keys

```ts
export const queryKeys = {
  profile: ['profile'] as const,
  postureReports: (userId: string) => ['posture-reports', userId] as const,
  roadmap: (userId: string) => ['roadmap', userId] as const,
  dailyPlan: (userId: string, date: string) => ['daily-plan', userId, date] as const,
  progress: (userId: string) => ['progress', userId] as const,
};
```

Gom key vào một chỗ để invalidate không gõ sai chuỗi.

## Auth gate

```text
SecureStore.getItem('token')
  → null: route (auth)/login
  → có: GET /auth/profile
      → 200: route (app)/*, render <App />
      → 401: clearSession, route (auth)/login
```

Boot gate là một component `SessionGate` trong `app/_layout.tsx`, không phải logic rải trong từng màn hình.

## Offline

- Camera loop và rep counting phải chạy hoàn toàn offline.
- Chi tiết trong `pose-pipeline.md`.
- Cache plan/roadmap bằng SQLite để mở lại app khi mất mạng vẫn xem được; hiển thị badge "dữ liệu đã lưu cục bộ" và thời điểm đồng bộ gần nhất.

## Accessibility (bắt buộc)

- Mọi nút có `accessibilityLabel` tiếng Việt, `accessibilityRole`.
- Vùng camera phải có `accessibilityLabel` mô tả trạng thái scan.
- Feedback lỗi form: dùng cả `accessibilityLiveRegion` và thông báo lỗi, không chỉ đổi màu viền.
- Tương phản chữ tối thiểu 4.5:1.
- Touch target tối thiểu 44x44.
- Không dùng màu đơn độc để truyền đạt nghĩa; luôn kèm icon hoặc chữ.

## Test

- Unit: `utils/landmarks.ts`, `pose/` smoothing và FSM, `thresholds.ts`, `errors.ts`.
- Hook: `useAuth`, `usePostureAssess` với QueryClient wrapper.
- Component: chỉ test hành vi quan trọng (hiện cảnh báo khi `reliable: false`).
- Không snapshot toàn màn hình — dễ vỡ và không bắt được bug thật.
