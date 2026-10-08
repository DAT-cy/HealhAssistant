---
description: Xây dựng app React Native hoàn chỉnh cho Health Assistant theo API contract backend
agent: code
---

Hãy load skill `rn-health-assistant` trước khi bắt đầu, rồi đọc tất cả file trong `references/`.

Nhiệm vụ: **thiết kế và xây dựng app React Native hoàn chỉnh** cho dự án Health Assistant tại `D:\HealthAssistantProject`.

Yêu cầu đầu ra: $ARGUMENTS

## Bối cảnh bắt buộc

Backend đã tồn tại là Spring Boot 3 / Java 17 tại `src/main/java/health_assistant/`. Trước khi viết code app, hãy đọc các file backend sau để lấy shape chính xác. Tuyệt đối không đoán shape của API:

- `src/main/java/health_assistant/config/response/DefaultRes.java`, `ErrorCode.java`, `StatusCode.java`
- `src/main/java/health_assistant/utils/ClientUtils.java`
- `src/main/java/health_assistant/config/app/SecurityConfig.java`
- `src/main/java/health_assistant/module/users/controller/AuthController.java` cùng `module/users/dto/`
- `src/main/java/health_assistant/module/posture/controller/PostureController.java`, `service/PostureAssessmentService.java`, `dto/`
- `src/main/java/health_assistant/module/coach/controller/` (GeminiCoachController, PoseEngineController, WorkoutEngineController) cùng `dto/`
- Tài liệu: `README.md`, `Business.md`, `AI_ROADMAP.md`, `IMPLEMENTATION_CHECKLIST.md`, `phases/*.md`

## Cách làm

1. **Khảo sát trước khi viết.** Xác nhận package manager, thư mục app đặt ở đâu (mặc định `mobile/`), và kiểm tra đã có `package.json`, `tsconfig.json`, cấu hình lint/typecheck chưa. Nếu có sẵn thì tôn trọng, không khởi tạo chồng.

2. **Khởi tạo project.** Expo + TypeScript strict + Expo Router có typedRoutes, hoặc stack tương đương nếu dự án đã có. Cài đúng phiên bản tương thích, không đoán phiên bản.

3. **Dựng tầng nền theo thứ tự này**, mỗi bước phải typecheck sạch trước khi sang bước sau:
   - theme tokens + ThemeProvider + component gốc trong `src/components/`
   - `src/i18n/vi.ts` chứa toàn bộ chuỗi tiếng Việt
   - `src/config/env.ts` (base URL, feature flags) và `src/config/thresholds.ts` (ngưỡng, chú thích nguồn từ backend)
   - `src/api/types.ts` khớp 1-1 với DTO Java, `src/api/client.ts`, `src/api/endpoints.ts`
   - store auth + SecureStore + `SessionGate` trong `app/_layout.tsx`
   - service layer cho từng endpoint đã tồn tại

4. **Xây dựng màn hình theo luồng nghiệp vụ**, đúng thứ tự phụ thuộc:
   - Auth: login và signup (signup chỉ nhận Gmail, validate ngay ở client)
   - Onboarding profile
   - Posture scan: chụp chính diện và nghiêng, dựng `PostureAssessmentRequest`, hiển thị report
   - Roadmap: `POST /coach/roadmap`, phân biệt rõ `source: 'fallback'`
   - Daily plan
   - Workout real-time: camera, pose, đếm rep, feedback TTS
   - Progress

5. **Xử lý endpoint chưa tồn tại.** `/profiles`, `/daily-plans/generate`, `/coach/chat`, `/progress/summary` chưa có controller. Với mỗi cái: service có implementation `remote` và `local` (demo, có nhãn nguồn dữ liệu), bật qua feature flag. Tuyệt đối không dựng dữ liệu giả mà không ghi nhãn.

6. **Áp dụng các quy tắc cứng** trong skill, đặc biệt:
   - visibility gate `>= 0.5`: khi `reliable` là false thì không hiển thị kết luận, chỉ hướng dẫn chỉnh camera
   - không dùng từ chẩn đoán, điều trị, bệnh, chấn thương ở bất kỳ chuỗi UI nào
   - có prompt hỏi mức đau và đường thoát dừng bài luôn nhìn thấy
   - camera loop và rep counting chạy được offline
   - không gọi LLM ở mỗi frame; đồng bộ `/workout-engine/track` theo chu kỳ
   - disclaimer "không thay thế chẩn đoán y khoa" hiển thị ở các màn hình phù hợp
   - không hardcode secret, URL production, hay magic number cho ngưỡng

7. **Test.** Unit test cho `utils/landmarks`, `pose/` gồm smoothing và FSM, `thresholds`, `errors`; hook test với QueryClient wrapper. Fixture landmark phải chạy offline, không cần camera.

8. **Xác minh.** Chạy typecheck, lint, test. Báo cáo lệnh đã chạy và kết quả. Không khẳng định đã chạy thử trên thiết bị thật nếu không thật.

## Ràng buộc

- Không sửa backend trừ khi phát hiện bug cụ thể. Nếu cần sửa backend, dừng lại và nêu lý do cùng đề xuất cụ thể.
- Không tạo dữ liệu demo giả mà không ghi nhãn nguồn.
- Ưu tiên hoàn chỉnh một màn hình chạy thật với API thật, rồi mới sang màn hình kế tiếp. Không để lại nhiều màn hình dang dở cùng lúc.
- Báo cáo cuối nêu: cấu trúc đã tạo, endpoint nào dùng, màn hình nào chạy được end-to-end, phần nào còn phụ thuộc endpoint chưa tồn tại, lệnh kiểm chứng, và cách chạy thử.
