# Lộ trình 12 tuần - AI Virtual Personal Trainer với Gemini API

## 1. Định hướng chính

Đồ án không tự huấn luyện model riêng. Gemini là AI trung tâm, còn Java chịu trách nhiệm bảo đảm tính đúng đắn, an toàn, tính nhất quán và lưu vết.

Điểm sâu của đồ án nằm ở:

- Multi-step AI workflow thay vì một lần gọi chatbot.
- Structured output bằng JSON Schema.
- Prompt versioning, validation, retry, fallback và observability.
- RAG từ tri thức tập luyện được kiểm duyệt.
- AI agent có tool gọi dữ liệu tư thế, lịch sử tập và nutrition calculator.
- Memory cá nhân hóa theo người dùng.
- Guardrail an toàn và human-in-the-loop.
- Đánh giá chất lượng LLM có bộ test cố định.

## 2. Phạm vi sản phẩm cuối cùng

Người dùng đi qua 6 bước:

```text
Profile -> AI Posture Report -> AI Roadmap -> AI Daily Plan -> AI Workout Coach -> AI Progress Review
```

### Tính năng AI phải có

1. **Posture Insight:** Gemini giải thích posture report từ dữ liệu landmark đã tính sẵn.
2. **Roadmap Planner:** Sinh mục tiêu và giai đoạn 6-8 tuần.
3. **Daily Plan Generator:** Sinh kế hoạch ăn + tập theo ngày.
4. **Conversational Coach:** Hỏi đáp dựa trên dữ liệu thật của user.
5. **Workout Copilot:** Sinh câu nhắc theo lỗi form và context bài tập.
6. **Adaptive Planner:** Điều chỉnh bài tiếp theo dựa trên kết quả buổi trước.
7. **Progress Analyst:** So sánh scan/history và giải thích xu hướng.
8. **Safety Guard:** Nhận diện nội dung rủi ro, đau, chống chỉ định và chuyển chuyên gia.

## 3. Nguyên tắc kỹ thuật để được điểm cao

- Gemini không được tự quyết định dữ liệu số quan trọng. BMR, TDEE, macro và góc khớp phải do Java tính.
- Gemini chỉ nhận context tối thiểu đã chuẩn hóa, không nhận video thô.
- Mọi output phải có schema, validate, sanitize và lưu prompt/model/version.
- Mỗi câu trả lời phải nêu nguồn context: `POSTURE_REPORT`, `WORKOUT_HISTORY`, `KNOWLEDGE_BASE` hoặc `GEMINI_REASONING`.
- Mỗi workflow có fallback khi timeout, quota hoặc JSON lỗi.
- Dữ liệu sức khỏe phải có consent, masking và chức năng xóa.

## 4. Lộ trình từng tuần

### Tuần 1 - Khóa bài toán, dữ liệu và kiến trúc AI

**Mục tiêu:** Có thiết kế đủ rõ để không xây tính năng rời rạc.

**Java phải làm**

- Tạo module `profile`, `posture`, `roadmap`, `dailyplan`, `workout`, `progress`, `ai`.
- Chốt entity: `UserProfile`, `PostureReport`, `Roadmap`, `DailyPlan`, `WorkoutSession`, `AiInteraction`.
- Tạo enum `Goal`, `ActivityLevel`, `ExperienceLevel`, `RiskLevel`, `AiSource`.
- Viết API contract trong OpenAPI cho toàn bộ luồng.

**AI phải làm**

- Viết AI context object chuẩn: profile + posture summary + constraints + history summary.
- Thiết kế prompt registry: `POSTURE_INSIGHT_V1`, `ROADMAP_V1`, `DAILY_PLAN_V1`.
- Thiết kế JSON schema cho 8 tính năng AI.

**Đầu ra**

- Sơ đồ kiến trúc, ERD, API contract, prompt registry và schema version 1.

**Tiêu chí hoàn thành**

- Tất cả API có request/response mẫu.
- Không có API nào nhận trực tiếp prompt tự do từ frontend.

### Tuần 2 - Hồ sơ thể chất và safety profile

**Mục tiêu:** AI hiểu đúng người dùng trước khi đưa lời khuyên.

**Java phải làm**

- CRUD profile: tuổi, giới tính, chiều cao, cân nặng, mục tiêu, cấp độ.
- Lưu allergies, medical flags, pain areas, unavailable equipment.
- Tạo `consent` và `privacy preferences`.
- Validation tuổi, BMI input, mục tiêu và dữ liệu bắt buộc.

**AI phải làm**

- Gemini tạo `UserFitnessSummary` có cấu trúc.
- Phân loại `RiskLevel`: LOW, MEDIUM, HIGH.
- HIGH risk không được tự sinh bài nặng; trả khuyến nghị gặp chuyên gia.

**Đầu ra**

- API `POST /profiles`, `POST /profiles/{id}/ai-summary`.

**Tiêu chí hoàn thành**

- Profile thiếu dữ liệu hoặc có pain flag được xử lý riêng, không gọi prompt tập nặng.

### Tuần 3 - Posture Scan và Posture Insight

**Mục tiêu:** Biến landmark thành báo cáo AI dễ hiểu.

**Java phải làm**

- Hoàn thiện posture engine: angle, visibility, confidence, findings.
- Lưu `PostureReport` theo front/side view.
- Tạo `POST /posture/assess` và `GET /posture/reports/{userId}`.

**Gemini phải làm**

- Nhận posture metrics đã tính, tuyệt đối không nhận ảnh/video.
- Trả `PostureInsight`: summary, findings, priorities, safe_exercises, explanation.
- Prompt phải yêu cầu không chẩn đoán y khoa.

**Đầu ra**

- Scan -> JSON report -> Gemini explanation.

**Tiêu chí hoàn thành**

- Ảnh hưởng của visibility thấp được nói rõ.
- Gemini không được tự bịa góc đo không có trong input.

### Tuần 4 - Pose Engine và AI Form Coach

**Mục tiêu:** Theo dõi bài tập real-time và tạo phản hồi có context.

**Java phải làm**

- FSM cho Squat, Glute Bridge, Bicep Curl.
- Lưu frame summary: angle, phase, visibility, detected error.
- Tạo form score và lỗi chuẩn hóa: `KNEE_VALGUS`, `ROUNDED_BACK`, `SHALLOW_DEPTH`.
- Cooldown feedback để tránh spam.

**Gemini phải làm**

- Tạo feedback dictionary theo lỗi, bài tập và cấp độ.
- Sinh câu nhắc tiếng Việt ngắn, không gọi Gemini ở từng frame.
- Gemini chỉ được gọi khi bắt đầu bài hoặc khi có lỗi lặp lại.

**Đầu ra**

- Real-time feedback bằng rule + câu nói do Gemini chuẩn bị trước.

**Tiêu chí hoàn thành**

- Camera loop không phụ thuộc mạng.
- Feedback có severity, message, cooldown và source.

### Tuần 5 - AI Roadmap Planner

**Mục tiêu:** Gemini sinh lộ trình 6-8 tuần có logic tiến triển.

**Java phải làm**

- API `POST /coach/roadmaps`.
- Lưu roadmap version, prompt version, model, input hash và output.
- Validate số tuần, mục tiêu, phase, weekly goals và safety notes.

**Gemini phải làm**

- Chia roadmap thành `Assessment -> Foundation -> Progression -> Maintenance`.
- Mỗi tuần có mục tiêu SMART, workout focus, recovery và success metric.
- Dùng posture priority để chọn corrective exercise.

**Đầu ra**

- Roadmap 8 tuần hiển thị timeline.

**Tiêu chí hoàn thành**

- Cùng input + cùng prompt version cho kết quả có format ổn định.
- Output thiếu field bị reject và fallback.

### Tuần 6 - Daily Nutrition và Workout Planner

**Mục tiêu:** Sinh kế hoạch ngày nhưng số liệu vẫn do Java kiểm soát.

**Java phải làm**

- Tính BMR, TDEE, calorie target, protein/carb/fat.
- API `POST /daily-plans/generate`.
- Kiểm tra calories, macro, allergies và thiết bị.
- Cache daily plan theo profile + roadmap + date.

**Gemini phải làm**

- Sinh 3 bữa chính + 1 bữa phụ theo khẩu vị Việt Nam.
- Sinh bài tập theo phase, sets, reps, rest, tempo, form cues.
- Không để Gemini tự thay đổi target calories.

**Đầu ra**

- Daily Plan hợp lệ gồm nutrition + workout + safety note.

**Tiêu chí hoàn thành**

- Calories sai quá 10% thì Java reject và yêu cầu Gemini sửa.

### Tuần 7 - Conversational Coach với RAG

**Mục tiêu:** Có chatbot chuyên biệt, trả lời dựa trên tri thức kiểm duyệt.

**Java phải làm**

- API `POST /coach/chat`.
- Lưu conversation và tóm tắt memory, không lưu token thừa.
- Tạo knowledge source: bài tập, posture, safety, nutrition.
- Chèn context user hiện tại vào prompt.

**Gemini phải làm**

- Trả lời câu hỏi kỹ thuật, thay món, thay bài, giải thích roadmap.
- Phân biệt dữ liệu user với kiến thức chung.
- Khi thiếu context: nói rõ không đủ dữ liệu, không bịa.

**Đầu ra**

- Chatbot nhớ mục tiêu, hạn chế và kế hoạch của user.

**Tiêu chí hoàn thành**

- Có 20 câu hỏi test: 15 câu trong phạm vi, 5 câu ngoài phạm vi.
- Câu ngoài phạm vi được từ chối an toàn.

### Tuần 8 - AI Agent và Tool Calling

**Mục tiêu:** Gemini không chỉ chat mà gọi được tool Java.

**Tools cho Gemini**

- `getLatestPostureReport(userId)`.
- `getTodayPlan(userId)`.
- `getWorkoutHistory(userId, days)`.
- `calculateNutrition(profile, activity)`.
- `suggestPlanAdjustment(input)`.

**Java phải làm**

- Tool registry, input schema, authorization theo userId.
- Giới hạn số tool call và timeout.
- Log tool name, input hash, result summary và final answer.

**Tiêu chí hoàn thành**

- Gemini không truy cập DB trực tiếp.
- Tool trả dữ liệu thật; nếu tool lỗi, agent không bịa kết quả.

### Tuần 9 - Adaptive Coach và Progress Review

**Mục tiêu:** Kế hoạch thay đổi theo dữ liệu buổi tập.

**Java phải làm**

- Tính completion rate, form score, RPE, pain flag, adherence.
- API `POST /coach/adapt-plan`.
- Rule gate: đau hoặc risk cao thì giảm tải/dừng.
- API `GET /progress/summary`.

**Gemini phải làm**

- Giải thích tại sao tăng/giảm sets, reps hoặc rest.
- Tạo weekly review: achieved, missed, reasons, next focus.
- Tạo motivation phù hợp nhưng không hứa kết quả.

**Tiêu chí hoàn thành**

- Mọi quyết định có `reason`, `input metrics` và `safety check`.

### Tuần 10 - Evaluation, Guardrail và Observability

**Mục tiêu:** Chứng minh hệ thống AI có chất lượng, không chỉ demo đẹp.

**Bộ đánh giá**

- JSON validity rate.
- Schema violation rate.
- Fallback rate.
- Groundedness: câu trả lời có dùng đúng context không.
- Safety pass rate trên các prompt có đau/chống chỉ định.
- Consistency: cùng input có giữ được cấu trúc và mục tiêu không.
- Latency p50/p95, token cost, error rate.

**Java phải làm**

- Bảng `ai_evaluation_case` và `ai_evaluation_result`.
- Prompt injection filter.
- PII masking trong log.
- Dashboard metrics theo từng use case.

**Đầu ra**

- Bộ 50 test cases: 30 bình thường, 10 safety, 5 thiếu dữ liệu, 5 prompt injection.

### Tuần 11 - Tích hợp sản phẩm và thực nghiệm

**Mục tiêu:** Chạy trọn luồng và thu số liệu cho báo cáo.

**Luồng kiểm thử**

```text
Create Profile -> Scan -> Posture Insight -> Roadmap -> Daily Plan -> Workout -> Review -> Adapt
```

**Việc làm**

- Viết integration test cho luồng trên.
- Kiểm thử Gemini timeout, quota error, invalid JSON, duplicate request.
- So sánh: có/không có RAG, có/không có tool calling, có/không có validator.
- Chụp metric trước và sau mỗi guardrail.

**Đầu ra**

- Bảng thực nghiệm và phân tích lỗi.

### Tuần 12 - Demo, báo cáo và bảo vệ

**Mục tiêu:** Biến sản phẩm thành đồ án có câu chuyện khoa học rõ ràng.

**Kịch bản demo 5 phút**

1. 30 giây: tạo profile và chọn mục tiêu giảm cân/cải thiện tư thế.
2. 60 giây: scan, posture metrics và Gemini giải thích.
3. 60 giây: Gemini tạo roadmap 8 tuần.
4. 60 giây: tạo daily plan gồm bữa ăn và workout.
5. 60 giây: tập Squat sai, nhận cảnh báo, hoàn thành rep.
6. 30 giây: weekly review và AI adapt plan.

**Báo cáo cần có**

- Kiến trúc hệ thống AI.
- Thiết kế prompt, schema, RAG và tool calling.
- Guardrail, privacy và safety.
- Bộ evaluation, bảng metric và phân tích lỗi.
- Chi phí Gemini và giới hạn khi phụ thuộc API bên thứ ba.

## 5. Tính năng không làm trong MVP

- Không chẩn đoán bệnh hoặc phát hiện chấn thương y khoa.
- Không gọi Gemini ở từng frame camera.
- Không để Gemini tính trực tiếp số calories quan trọng.
- Không làm mobile app, wearable và multi-language cùng lúc.
- Không mở quá 3 bài tập trước khi luồng chính ổn định.

## 6. Kết quả kỳ vọng

Nếu hoàn thành đúng kế hoạch, đồ án có thể chứng minh được:

- AI hiểu dữ liệu tư thế và hồ sơ cá nhân.
- LLM sinh kế hoạch có cấu trúc, có kiểm soát.
- AI có memory, RAG, tool calling và adaptive workflow.
- Hệ thống có safety guardrail, evaluation và fallback.
- Sản phẩm chạy được end-to-end thay vì chỉ gọi Gemini để sinh text.
