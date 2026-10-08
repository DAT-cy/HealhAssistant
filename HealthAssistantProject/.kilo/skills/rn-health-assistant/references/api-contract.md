# API Contract (backend Spring Boot 3)

Nguồn: `src/main/java/health_assistant/`. Cập nhật file này khi backend đổi.

## Base URL

Mọi endpoint nằm dưới `/api/v1` (`ClientUtils.VERSION`).

```
local  -> http://localhost:8080   (backend chạy bằng ./gradlew bootRun)
device -> http://<LAN-IP>:8080   (Android emulator dùng 10.0.2.2 thay localhost)
```

Lưu Ý: `ClientUtils.LOCAL_SERVER_URL` trong backend là `http://localhost:11234/`, nhưng `application.yml` không set `server.port`, nên backend thực tế chạy ở **8080**. App nên để base URL cấu hình được qua env, mặc định 8080.

CORS đã mở `/**` cho mọi origin với `allowCredentials(true)`, nên app không cần proxy.

## Envelope

Mọi response (kể cả lỗi) bọc trong `DefaultRes<T>`:

```json
{
  "statusCode": 200,
  "responseCode": null,
  "responseMessage": "Success",
  "data": {}
}
```

- `statusCode`: HTTP status lặp lại trong body.
- `responseCode`: chỉ có khi lỗi, lấy từ `ErrorCode` enum.
- `responseMessage`: mô tả, có thể hiển thị được nhưng không phải nguồn sự thật duy nhất.
- `data`: payload thật; `null` khi lỗi.

Client phải tách `data` ra và ép kiểu có kiểm tra. Không truy cập trực tiếp `body.data.x` rải rác khắp màn hình.

## TS types

```ts
export interface ApiEnvelope<T> {
  statusCode: number;
  responseCode: string | null;
  responseMessage: string;
  data: T | null;
}
```

## Types

```ts
export type Role = 'ROLE_ADMIN' | 'ROLE_USER';

export interface LoginResponse {
  token: string;
  username: string;
  role: Role;
}

export interface ProfileUser {
  username: string;
  role: Role;
}

export interface Point3D {
  x: number; y: number; z: number;
  visibility: number; // 0..1
}

export type PostureView = 'FRONT' | 'SIDE';

export interface PostureAssessmentResponse {
  view: PostureView;
  reliable: boolean;
  shoulderImbalanceDegrees: number;
  pelvicTiltDegrees: number;
  forwardHeadDegrees: number;
  findings: string[];
  recommendations: string[];
}

export type WorkoutPhase = 'UP' | 'DOWN' | 'TRANSITION' | 'UNAVAILABLE';

export interface WorkoutFeedback {
  exercise: string;
  repetitionCount: number;
  phase: WorkoutPhase;
  jointAngle: number;
  corrections: string[];
  confident: boolean;
}

export interface GeminiRoadmapResponse {
  title: string;
  overview: string;
  weeklyPlan: string[];   // backend hiện là string[], roadmap mới sẽ là object[]
  safetyNotes: string[];
  source: string;        // 'gemini' | 'fallback' — luôn hiển thị khi là 'fallback'
}

export interface AngleRequest {
  first: Point3D;
  vertex: Point3D;
  last: Point3D;
}
// response data: number (góc độ)
```

## Endpoint đã tồn tại

### Auth

```
POST /api/v1/auth/login
body: { username: string; password: string }
data: LoginResponse
```

```
POST /api/v1/auth/signup
body: { email: string; password: string }
data: boolean
```

Lưu ý bất đối xứng cần xử lý đúng ở UI:
- Login dùng `username`.
- Signup dùng `email` và backend chỉ chấp nhận **Gmail** (`^[a-zA-Z0-9._%+-]+@gmail\.com$`).

Vì vậy form đăng ký phải validate domain Gmail ngay từ client, không chờ server báo lỗi.

```
GET /api/v1/auth/profile
data: ProfileUser   (yêu cầu Bearer token)
```

### Posture

```
POST /api/v1/posture/assess
body: {
  leftShoulder, rightShoulder, leftHip, rightHip, leftEar, rightEar, neck: Point3D,
  view: 'FRONT' | 'SIDE'
}
data: PostureAssessmentResponse
```

Ngưỡng backend dùng (để hiểu ý nghĩa `reliable`, không nhân bản sang app):
`MIN_VISIBILITY=0.5`, `SHOULDER_THRESHOLD=3.0`, `PELVIS_THRESHOLD=3.0`, `FORWARD_HEAD_THRESHOLD=10.0`.

### Pose engine

```
POST /api/v1/pose-engine/angle
body: { first, vertex, last: Point3D }
data: number  // góc độ
```

### Workout engine

```
POST /api/v1/workout-engine/track?exercise=squat&jointAngle=85.2&visibility=0.92
```

Lưu ý: **tham số nằm trên query string**, không phải body. Backend chấp nhận `exercise` dạng `squat` hoặc `squats`, không phân biệt hoa thường và `_`/`-`. Chỉ `squat` được hỗ trợ; bài khác trả 400 (`IllegalArgumentException` → 500 qua handler hiện tại).

```
data: WorkoutFeedback
```

Ngưỡng FSM squat ở backend: `DOWN_ENTER_ANGLE=95`, `UP_RETURN_ANGLE=155`.

### Coach

```
POST /api/v1/coach/roadmap
body: { goal: string; weeks: number /*1..12*/; postureSummary?: string; restrictions?: string }
data: GeminiRoadmapResponse
```

Không có `GEMINI_API_KEY` thì trả roadmap fallback với `source: 'fallback'`. App phải hiện badge "kế hoạch dự phòng" để không bán nhầm cho người dùng.

## Endpoint chưa tồn tại

Được lên kế hoạch trong `IMPLEMENTATION_CHECKLIST.md` nhưng **chưa có controller**:

| Endpoint | Module dự kiến |
|---|---|
| `POST /api/v1/profiles` | profile |
| `GET /api/v1/profiles/{userId}` | profile |
| `GET /api/v1/posture/reports/{userId}` | posture |
| `POST /api/v1/coach/posture-insight` | coach |
| `POST /api/v1/coach/chat` | coach |
| `POST /api/v1/coach/adapt-plan` | coach |
| `POST /api/v1/daily-plans/generate` | dailyplan |
| `GET /api/v1/daily-plans/{userId}/{date}` | dailyplan |
| `GET /api/v1/progress/summary` | progress |

Cách xử lý: service tương ứng có một implementation `local` (dữ liệu tĩnh có nhãn rõ là demo) và implementation `remote`. Chuyển qua bằng feature flag trong config. Mọi màn hình phải hiển thị nhãn nguồn dữ liệu để không giả dạng sản phẩm thật.

## Endpoint test/stub — không dùng

`GET /api/v1/user/users` và `GET /api/v1/admin/users` hiện chỉ trả về chuỗi "Test" (`UserController`, `AdminController`). Không xây UI nào lên chúng.

## Xử lý lỗi

`ErrorCode` quan trọng cho UI:

| responseCode | HTTP | Xử lý ở app |
|---|---|---|
| `AUTH-ERR-401` JWT_EXPIRED | 401 | Xoá token, về màn hình login, thông báo "phiên đăng nhập đã hết hạn". Chỉ xử lý một lần ở client. |
| `AUTH-ERR-402` JWT_INVALID | 401 | Như trên. |
| `AUTH-ERR-403` JWT_MALFORMED | 401 | Như trên. |
| `AUTH-ERR-404` JWT_UNSUPPORTED | 401 | Như trên. |
| `AUTH-ERR-405` USERNAME_ALREADY_EXISTS | 400 | Bám lỗi vào trường email ở form signup. |
| `AUTH-ERR-408` WRONG_PASSWORD | 401 | Bám lỗi vào trường password. Lưu ý trùng mã với `TOKEN_NOT_FOUND` — phân biệt qua `statusCode`. |
| `COMMON-ERR-400` BAD_REQUEST | 400 | Thường kèm `data` là map `{ field: message }` từ `GlobalExceptionHandler`. |
| `COMMON-ERR-402` UNAUTHORIZED | 401 | Về login. |
| `COMMON-ERR-404` ENTITY_NOT_FOUND | 404 | Trạng thái "không tìm thấy dữ liệu". |
| `COMMON-ERR-500` INTER_SERVER_ERROR | 500 | Trạng thái lỗi chung + gợi ý thử lại. |
| `FORBIDDEN-ERR-403` | 403 | Nhắc đăng nhập lại hoặc không có quyền. |

Response lỗi validation có shape:

```json
{ "statusCode": 400, "responseMessage": "...", "data": { "email": "Email must be a valid Gmail address" } }
```

Type lỗi: `type ValidationErrors = Record<string, string>`.

## Endpoint không cần token (white list)

`/api/v1/auth/**`, `/api/v1/public/**`, `/swagger-ui/**`, `/api-docs/**`, `/v3/api-docs/**`.

Mọi endpoint khác yêu cầu Bearer token.
