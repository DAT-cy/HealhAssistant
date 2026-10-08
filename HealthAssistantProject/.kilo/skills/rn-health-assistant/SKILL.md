---
name: rn-health-assistant
description: Dùng khi thiết kế hoặc viết React Native app cho Health Assistant (AI virtual PT) — kiến trúc app, luồng scan tư thế, pose pipeline real-time, roadmap/daily plan/workout, chat coach, design system, và quy tắc khớp API contract của backend Spring Boot. Kích hoạt khi người dùng nhắc tới React Native, Expo, mobile app, camera scan, MediaPipe trên RN, hoặc "app" của dự án này.
---

# React Native cho Health Assistant

Backend của dự án là Spring Boot 3 (Java 17) tại `src/main/java/health_assistant/`. App React Native là **client** của backend đó: không tự tính chỉ số sức khỏe, không tự sinh kế hoạch, không tự quyết định chẩn đoán. Mọi quyết định về tư thế, góc khớp, số rep chính thức và kế hoạch đều đến từ API.

Vì vậy nguyên tắc số một: **app là lớp trình bày và điều phối camera, không phải nơi tính toán quyết định.** Khi nghi ngờ, ưu tiên sửa phía backend và báo lại, đừng nhân bản logic sang app.

## Khi nào dùng skill này

- Thiết kế cấu trúc app, navigation, state, data layer cho RN.
- Viết hoặc review màn hình RN của luồng Profile → Scan → Roadmap → Daily Plan → Workout → Progress.
- Làm việc với camera, MediaPipe pose, đếm rep real-time, feedback TTS/HUD.
- Cần tra cứu chính xác shape của request/response API để code TS types.
- Kiểm tra một màn hình RN có đúng quy tắc sản phẩm (visibility gate, an toàn, offline, accessibility).

## Tham chiếu

Đọc file tương ứng trước khi code. Không đoán shape của API.

| File | Khi nào đọc |
|---|---|
| `references/api-contract.md` | Viết/sửa API client, TS types, xử lý lỗi, token. Đọc bắt buộc trước mọi thay đổi liên quan network. |
| `references/app-architecture.md` | Chọn thư viện, tổ chức folder, navigation, state, storage, testing. |
| `references/pose-pipeline.md` | Camera scan, smoothing, rep counting, feedback, xử lý offline. |
| `references/design-system.md` | Token màu/spacing/typography, component base, accessibility, dark mode. |

## Luồng nghiệp vụ bắt buộc

App phải hỗ trợ đủ luồng 6 bước của đồ án (`AI_ROADMAP.md` §2):

```text
Profile -> AI Posture Report -> AI Roadmap -> AI Daily Plan -> AI Workout Coach -> AI Progress Review
```

Trạng thái onboarding theo dõi bằng local flag: `profileComplete`, `hasPostureReport`, `hasRoadmap`, `hasTodayPlan`. Dashboard điều hướng bằng các flag này, không suy diễn từ token.

## API: những điều không được sai

Tóm tắt, chi tiết ở `references/api-contract.md`.

- Base path: `/api/v1`. Không hardcode host trong code, đọc từ env/config.
- Mọi response bọc trong envelope: `{ statusCode, responseCode, responseMessage, data }`. Luôn đọc `data`.
- Login trả `{ token, username, role }`. Token là JWT, gửi qua `Authorization: Bearer`.
- Chỉ mới có thật: `POST /auth/login`, `POST /auth/signup`, `GET /auth/profile`, `POST /posture/assess`, `POST /pose-engine/angle`, `POST /workout-engine/track`, `POST /coach/roadmap`.
- Endpoint trong `IMPLEMENTATION_CHECKLIST.md` (`/profiles`, `/daily-plans/generate`, `/coach/chat`, `/progress/summary`, ...) **chưa tồn tại**. Khi cần chúng, code phải chịu được 404: có fallback nội bộ, không crash, không màn hình trắng. Ghi chú rõ điểm này khi báo cáo.

## Quy tắc sản phẩm không được vi phạm

Đây là các ràng buộc từ `Business.md` và `README.md`. Vi phạm là sai sản phẩm, không phải sai code.

1. **Visibility gate.** Chỉ hiển thị kết luận tư thế khi mọi landmark bắt buộc có `visibility >= 0.5`. Backend trả `reliable: false`; app phải hiện hướng dẫn chỉnh lại camera và **không** hiển thị số đo như kết luận.
2. **Không chẩn đoán y khoa.** Không dùng từ chẩn đoán, điều trị, bệnh, chấn thương ở bất kỳ chuỗi UI nào. Đây là công cụ hỗ trợ tập luyện.
3. **Người dùng báo đau → giảm tải hoặc dừng.** Cần một prompt hỏi mức đau trước/sau bài và một đường thoát dừng bài luôn nhìn thấy.
4. **Không gửi video thô.** Chỉ gửi landmark và feature đã tính. Không upload ảnh khung hình.
5. **Không gọi Gemini mỗi frame.** App không gọi model trực tiếp; mọi AI call đi qua backend. Camera loop phải chạy được khi mất mạng.
6. **Tiếng Việt là ngôn ngữ chính.** Toàn bộ nội dung hướng dẫn, câu nhắc lỗi form, feedback TTS viết bằng tiếng Việt. Chỉ dùng tiếng Anh cho log kỹ thuật.
7. **Thiếu dữ liệu thì nói thẳng.** Khi API trả `data: null` hoặc endpoint chưa có, hiện trạng thái rõ ràng thay vì dựng số liệu giả.

## Quy tắc kỹ thuật

- **TypeScript strict**, không `any`. Kiểu dữ liệu phải khai báo tường minh ở `src/api/types/`.
- **Không có magic number cho ngưỡng.** `0.5`, `3.0`, `10.0`, `95`, `155` là quyết định nghiệp vụ của backend. Nếu app cần hiển thị hoặc cảnh báo, lấy từ response hoặc đặt trong một file cấu hình có tên rõ nghĩa và ghi chú nguồn.
- **Tách lớp.** Màn hình không gọi `fetch` trực tiếp; nó gọi hook, hook gọi service, service gọi client HTTP.
- **Xử lý lỗi bắt buộc.** Mỗi màn hình có trạng thái loading / empty / error / success. Không dùng `try/catch` nuốt lỗi.
- **Token hết hạn** → đăng xuất có kiểm soát, không lặp vô hạn. `401` kèm `AUTH-ERR-401` phải xử lý ở tầng client một lần duy nhất.
- **Không hardcode secret, API key, hay URL production** vào source.
- **Tiếng Việt có dấu đúng kiểu**; tránh dấu tiếng Việt trong identifier, biến, tên file.

## Định hướng stack

Ưu tiên Expo + TypeScript, React Navigation hoặc Expo Router, TanStack Query cho server state, Zustand cho client state, SecureStore cho token. Xác nhận phiên bản và sự tồn tại của thư viện trong `package.json` trước khi thêm; không tự chế thư viện thay thế. Chi tiết và phương án thay thế nằm ở `references/app-architecture.md`.

Pose: MediaPipe Tasks Vision qua VisionCamera frame processor hoặc native module. Chi tiết pipeline, thông số smoothing, FSM đếm rep và cooldown ở `references/pose-pipeline.md`.

## Định dạng báo cáo công việc

Khi báo cáo xong một phần, nêu: file đã tạo/sửa, endpoint nào được dùng, màn hình nào chạy được, phần nào còn phụ thuộc endpoint chưa tồn tại, và cách kiểm chứng thủ công. Không tuyên bố hoàn thành luồng nếu luồng đó còn dừng ở dữ liệu giả.

## Definition of Done cho một màn hình RN

Màn hình chỉ được coi là xong khi:

- Có loading, empty, error, success với dữ liệu thật từ API.
- Không có endpoint giả dữ liệu cứng còn sót lại.
- Tuân thủ visibility gate và nguyên tắc an toàn.
- Nội dung tiếng Việt đầy đủ, có dấu.
- Dùng token design system, không có màu/giá trị rời rạc.
- Có test cho logic không phụ thuộc UI (hook, service, selector).
- Chạy được trên cả Android lẫn iOS, không phụ thuộc môi trường desktop.
