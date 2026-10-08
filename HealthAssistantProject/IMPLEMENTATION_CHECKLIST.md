# Checklist triển khai từng tuần - Java Backend

Tài liệu này chia nhỏ lộ trình AI thành **checklist Java cụ thể** cho từng tuần. Dùng để theo dõi tiến độ và đảm bảo không bỏ sót.

---

## Tuần 1 - Kiến trúc và API Contract

### Module Structure
- [ ] Tạo package `health_assistant.module.profile`
- [ ] Tạo package `health_assistant.module.posture`
- [ ] Tạo package `health_assistant.module.roadmap`
- [ ] Tạo package `health_assistant.module.dailyplan`
- [ ] Tạo package `health_assistant.module.workout`
- [ ] Tạo package `health_assistant.module.progress`
- [ ] Tạo package `health_assistant.module.ai`

### Entity & Enum
- [ ] `UserProfile` entity: id, name, age, gender, height, weight, goal, activityLevel, experienceLevel
- [ ] `PostureReport` entity: userId, viewType, timestamp, findings[], confidence, riskLevel
- [ ] `Roadmap` entity: userId, title, overview, phases[], weeklyPlan[], createdAt, aiModel, promptVersion
- [ ] `DailyPlan` entity: userId, date, roadmapId, nutrition{}, workout{}, safetyNotes[]
- [ ] `WorkoutSession` entity: userId, dailyPlanId, exercise, reps, sets, formScore, completedAt
- [ ] `AiInteraction` entity: userId, interactionType, prompt, response, model, tokens, latency, fallback
- [ ] Enum `Goal`: WEIGHT_LOSS, MUSCLE_GAIN, POSTURE_FIX, GENERAL_FITNESS
- [ ] Enum `ActivityLevel`: SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE
- [ ] Enum `RiskLevel`: LOW, MEDIUM, HIGH
- [ ] Enum `AiSource`: POSTURE_REPORT, WORKOUT_HISTORY, KNOWLEDGE_BASE, GEMINI_REASONING

### Repository
- [ ] `UserProfileRepository`
- [ ] `PostureReportRepository`
- [ ] `RoadmapRepository`
- [ ] `DailyPlanRepository`
- [ ] `WorkoutSessionRepository`
- [ ] `AiInteractionRepository`

### API Contract (OpenAPI)
- [ ] `POST /api/v1/profiles` - tạo profile
- [ ] `GET /api/v1/profiles/{userId}` - lấy profile
- [ ] `POST /api/v1/posture/assess` - tạo posture report
- [ ] `GET /api/v1/posture/reports/{userId}` - lấy posture reports
- [ ] `POST /api/v1/coach/posture-insight` - Gemini giải thích posture
- [ ] `POST /api/v1/coach/roadmaps` - Gemini tạo roadmap
- [ ] `POST /api/v1/daily-plans/generate` - tạo daily plan
- [ ] `POST /api/v1/workout-engine/track` - theo dõi bài tập
- [ ] `POST /api/v1/coach/chat` - conversational coach
- [ ] `POST /api/v1/coach/adapt-plan` - adaptive planner
- [ ] `GET /api/v1/progress/summary` - progress review

### AI Infrastructure
- [ ] `PromptRegistry` class: lưu prompt template theo version
- [ ] `JsonSchemaValidator` service: validate Gemini output
- [ ] `GeminiClient` service: wrap HTTP call, timeout, retry
- [ ] `FallbackService` service: trả kết quả an toàn khi Gemini lỗi

---

## Tuần 2 - Profile và Safety

### Entity bổ sung
- [ ] Thêm `UserProfile`: allergies[], medicalFlags[], painAreas[], unavailableEquipment[]
- [ ] Thêm `consent`, `privacyPreferences`, `consentDate`
- [ ] Tạo `SafetyProfile` entity riêng nếu cần

### Validation
- [ ] Kiểm tra tuổi >= 16
- [ ] Kiểm tra BMI input hợp lệ
- [ ] Kiểm tra goal không null
- [ ] Kiểm tra risk level HIGH không được tự sinh bài nặng

### Service
- [ ] `ProfileService.create()`
- [ ] `ProfileService.update()`
- [ ] `ProfileService.calculateRiskLevel()`
- [ ] `SafetyGuardService.checkConstraints(profile)`

### Controller
- [ ] `ProfileController.createProfile()`
- [ ] `ProfileController.getProfile(userId)`
- [ ] `ProfileController.updateProfile(userId)`
- [ ] `ProfileController.getAiSummary(userId)` - gọi Gemini tóm tắt profile

### Gemini Integration
- [ ] Prompt `USER_FITNESS_SUMMARY_V1`: nhận profile, trả RiskLevel + summary + recommendations
- [ ] Schema cho `UserFitnessSummary`
- [ ] Fallback khi Gemini không khả dụng

### Test
- [ ] Unit test `ProfileService.calculateRiskLevel()`
- [ ] Integration test `POST /profiles`
- [ ] Test case: profile thiếu dữ liệu
- [ ] Test case: profile có pain flag -> risk HIGH

---

## Tuần 3 - Posture Scan và Posture Insight

### Posture Engine
- [ ] `PostureCalculator.calculateShoulderImbalance(landmarks)`
- [ ] `PostureCalculator.calculatePelvicTilt(landmarks)`
- [ ] `PostureCalculator.calculateForwardHeadPosture(landmarks)`
- [ ] `PostureCalculator.validateVisibility(landmarks)` - reject nếu < 0.5

### Service
- [ ] `PostureAssessmentService.assess(landmarks, viewType)`
- [ ] Lưu `PostureReport` vào DB
- [ ] `PostureInsightService.generateInsight(postureReport)` - gọi Gemini

### Gemini Integration
- [ ] Prompt `POSTURE_INSIGHT_V1`: nhận metrics, trả summary + findings + priorities + safe_exercises + explanation
- [ ] Schema cho `PostureInsight`
- [ ] Guardrail: không chẩn đoán y khoa

### Controller
- [ ] `PostureController.assess()` - POST /posture/assess
- [ ] `PostureController.getReports(userId)` - GET /posture/reports/{userId}
- [ ] `PostureController.getInsight(reportId)` - GET /posture/reports/{reportId}/insight

### Test
- [ ] Test góc vai, chậu, đầu với fixture landmarks
- [ ] Test visibility thấp -> không kết luận
- [ ] Test Gemini insight có đủ fields

---

## Tuần 4 - Pose Engine và AI Form Coach

### FSM Tracking
- [ ] `ExerciseRepService.trackSquat(landmarks)` - FSM UP/DOWN
- [ ] `ExerciseRepService.trackGluteBridge(landmarks)`
- [ ] `ExerciseRepService.trackBicepCurl(landmarks)`
- [ ] `FormErrorDetector.detectKneeValgus(landmarks)`
- [ ] `FormErrorDetector.detectRoundedBack(landmarks)`
- [ ] `FormErrorDetector.detectShallowDepth(landmarks, exercise)`

### Service
- [ ] `WorkoutEngineService.startSession(userId, exercise)`
- [ ] `WorkoutEngineService.trackFrame(sessionId, landmarks)`
- [ ] `WorkoutEngineService.endSession(sessionId)`
- [ ] `FeedbackCooldownManager` - tránh spam feedback

### Gemini Integration
- [ ] Prompt `FORM_FEEDBACK_DICT_V1`: sinh dictionary feedback theo lỗi x bài tập x cấp độ
- [ ] Lưu feedback dictionary vào cache, không gọi Gemini mỗi frame
- [ ] Gemini chỉ được gọi khi bắt đầu bài hoặc lỗi lặp lại

### Controller
- [ ] `POST /workout-engine/start`
- [ ] `POST /workout-engine/track`
- [ ] `POST /workout-engine/end`

### Test
- [ ] Test FSM đếm rep chính xác
- [ ] Test form error detection
- [ ] Test cooldown không spam

---

## Tuần 5 - AI Roadmap Planner

### Service
- [ ] `RoadmapService.generateRoadmap(userId)`
- [ ] Lấy profile + posture report + goal
- [ ] Gọi Gemini với prompt `ROADMAP_V1`
- [ ] Validate roadmap schema
- [ ] Lưu roadmap + version + model + input hash

### Gemini Integration
- [ ] Prompt `ROADMAP_V1`: context user -> roadmap 6-8 tuần
- [ ] Schema: title, overview, phases[], weeklyPlan[week, goal, workoutFocus, recovery, successMetric], safetyNotes[]
- [ ] Fallback: roadmap template an toàn

### Controller
- [ ] `POST /coach/roadmaps`
- [ ] `GET /coach/roadmaps/{userId}`

### Test
- [ ] Test cùng input + cùng prompt version -> format ổn định
- [ ] Test thiếu field -> reject và fallback
- [ ] Test số tuần hợp lệ

---

## Tuần 6 - Daily Nutrition và Workout Planner

### Nutrition Calculator
- [ ] `NutritionCalculator.calculateBMR(profile)`
- [ ] `NutritionCalculator.calculateTDEE(bmr, activityLevel)`
- [ ] `NutritionCalculator.calculateTargetCalories(tdee, goal)`
- [ ] `NutritionCalculator.calculateMacros(targetCalories, goal)` - protein/carb/fat

### Service
- [ ] `DailyPlanService.generate(userId, date)`
- [ ] Tính nutrition metrics bằng Java
- [ ] Gọi Gemini sinh meals + workout
- [ ] Validate calories ± 10%, macro hợp lệ, allergies, equipment
- [ ] Cache daily plan theo profile + roadmap + date

### Gemini Integration
- [ ] Prompt `DAILY_PLAN_V1`: nhận target calories + macro + allergies + equipment + workout phase
- [ ] Schema: meals[name, ingredients, calories, protein, carb, fat], workout[exercise, sets, reps, rest, tempo, formCues], safetyNotes[]
- [ ] Nếu calories sai > 10% -> reject và yêu cầu Gemini sửa

### Controller
- [ ] `POST /daily-plans/generate`
- [ ] `GET /daily-plans/{userId}/{date}`

### Test
- [ ] Test BMR/TDEE/macro tính đúng
- [ ] Test Gemini trả calories sai -> reject
- [ ] Test allergies được filter

---

## Tuần 7 - Conversational Coach với RAG

### Knowledge Base
- [ ] Tạo thư mục `src/main/resources/knowledge/`
- [ ] Tạo file: `exercises.md`, `posture.md`, `safety.md`, `nutrition.md`
- [ ] `KnowledgeBaseLoader` service: load và index knowledge

### Service
- [ ] `ConversationService.chat(userId, message)`
- [ ] Lấy conversation history (giới hạn 10 turns)
- [ ] Lấy context: profile + posture + roadmap + daily plan
- [ ] Tìm kiếm knowledge base
- [ ] Gọi Gemini với context đầy đủ
- [ ] Lưu conversation và tóm tắt memory

### Gemini Integration
- [ ] Prompt `CONVERSATIONAL_COACH_V1`: context user + knowledge + history -> answer
- [ ] Guardrail: không chẩn đoán bệnh, không bịa dữ liệu
- [ ] Phân biệt dữ liệu user với kiến thức chung
- [ ] Khi thiếu context: nói rõ không đủ dữ liệu

### Controller
- [ ] `POST /coach/chat`
- [ ] `GET /coach/conversations/{userId}`

### Test
- [ ] 20 câu hỏi test: 15 trong phạm vi, 5 ngoài phạm vi
- [ ] Test câu ngoài phạm vi -> từ chối an toàn
- [ ] Test RAG tìm đúng context

---

## Tuần 8 - AI Agent và Tool Calling

### Tool Registry
- [ ] `ToolRegistry` class: đăng ký các tool
- [ ] `Tool` interface: name, description, input schema, execute()
- [ ] `ToolExecutor` service: gọi tool, log, timeout

### Tools
- [ ] `GetLatestPostureReportTool`
- [ ] `GetTodayPlanTool`
- [ ] `GetWorkoutHistoryTool`
- [ ] `CalculateNutritionTool`
- [ ] `SuggestPlanAdjustmentTool`

### Service
- [ ] `AgentService.executeWithTools(userId, message)`
- [ ] Gọi Gemini với tool definitions
- [ ] Parse tool calls từ response
- [ ] Execute tools
- [ ] Gọi lại Gemini với tool results
- [ ] Giới hạn số tool call và timeout

### Gemini Integration
- [ ] Prompt `AGENT_WITH_TOOLS_V1`: message + tool definitions -> tool calls + final answer
- [ ] Schema cho tool calls
- [ ] Guardrail: tool không truy cập DB trực tiếp, phải qua service

### Controller
- [ ] `POST /coach/agent` - chat với tool calling

### Test
- [ ] Test agent gọi đúng tool
- [ ] Test tool lỗi -> agent không bịa kết quả
- [ ] Test giới hạn số tool call

---

## Tuần 9 - Adaptive Coach và Progress Review

### Adaptive Logic
- [ ] `AdaptiveService.calculateMetrics(workoutSession)` - completion, formScore, RPE, pain, adherence
- [ ] `AdaptiveService.adaptPlan(userId, metrics)` - tăng/giảm sets, reps, rest
- [ ] Rule gate: đau hoặc risk cao -> giảm tải/dừng

### Service
- [ ] `ProgressService.getSummary(userId)` - weekly review
- [ ] `ProgressService.compareScans(userId)` - so sánh posture theo thời gian
- [ ] `ProgressService.generateWeeklyReview(userId)` - gọi Gemini

### Gemini Integration
- [ ] Prompt `ADAPTIVE_COACH_V1`: metrics -> adjustment + reason
- [ ] Prompt `WEEKLY_REVIEW_V1`: achieved + missed + reasons + next focus
- [ ] Guardrail: không hứa kết quả, chỉ khuyến nghị

### Controller
- [ ] `POST /coach/adapt-plan`
- [ ] `GET /progress/summary`
- [ ] `GET /progress/weekly-review`

### Test
- [ ] Test đau -> giảm tải
- [ ] Test completion cao -> tăng độ khó
- [ ] Test mọi quyết định có reason

---

## Tuần 10 - Evaluation, Guardrail và Observability

### Evaluation Framework
- [ ] `AiEvaluationCase` entity: id, useCase, input, expectedOutput, tags
- [ ] `AiEvaluationResult` entity: caseId, model, promptVersion, actualOutput, passed, metrics
- [ ] `EvaluationService.runEvaluation(cases)` - chạy bộ test
- [ ] `EvaluationService.calculateMetrics()` - JSON validity, schema violation, fallback rate, groundedness, safety pass rate, consistency

### Guardrail
- [ ] `PromptInjectionFilter` - chặn prompt injection
- [ ] `PiiMaskingService` - mask PII trong log
- [ ] `SafetyFilter` - chặn nội dung rủi ro

### Observability
- [ ] `AiMetricsService.recordInteraction(interaction)` - lưu metrics
- [ ] Dashboard metrics theo use case: latency p50/p95, token cost, error rate
- [ ] Logging: prompt version, model, input hash, output hash, fallback

### Test Cases
- [ ] 30 test cases bình thường
- [ ] 10 test cases safety (đau, chống chỉ định)
- [ ] 5 test cases thiếu dữ liệu
- [ ] 5 test cases prompt injection

### Controller
- [ ] `POST /ai/evaluate` - chạy evaluation
- [ ] `GET /ai/metrics` - dashboard metrics

---

## Tuần 11 - Integration Test và Thực nghiệm

### Integration Test
- [ ] Test luồng: Create Profile -> Scan -> Posture Insight -> Roadmap -> Daily Plan -> Workout -> Review -> Adapt
- [ ] Test Gemini timeout
- [ ] Test Gemini quota error
- [ ] Test invalid JSON
- [ ] Test duplicate request

### Thực nghiệm
- [ ] So sánh: có/không có RAG
- [ ] So sánh: có/không có tool calling
- [ ] So sánh: có/không có validator
- [ ] Chụp metric trước/sau mỗi guardrail

### Đầu ra
- [ ] Bảng thực nghiệm
- [ ] Phân tích lỗi
- [ ] Chi phí Gemini
- [ ] Latency breakdown

---

## Tuần 12 - Demo và Báo cáo

### Demo
- [ ] Kịch bản demo 5 phút
- [ ] Video recording
- [ ] Slide demo

### Báo cáo
- [ ] Chương 1: Đặt vấn đề
- [ ] Chương 2: Cơ sở lý thuyết (Pose Estimation, LLM, Prompt Engineering, RAG, Tool Calling)
- [ ] Chương 3: Thiết kế hệ thống (Kiến trúc AI, prompt versioning, schema validation, guardrail)
- [ ] Chương 4: Thực nghiệm (Bộ evaluation, bảng metric, phân tích lỗi, chi phí)
- [ ] Chương 5: Kết luận và hướng phát triển

### Chuẩn bị câu hỏi hội đồng
- [ ] Bias: xử lý như thế nào khi Gemini thiên vị về gender, age?
- [ ] Privacy: dữ liệu sức khỏe được bảo vệ ra sao?
- [ ] Hallucination: làm sao biết Gemini không bịa dữ liệu?
- [ ] Medical safety: phân biệt hỗ trợ tập luyện với chẩn đoán y khoa?
- [ ] Generalization: khi nào hệ thống không hoạt động tốt?
- [ ] Chi phí: Gemini có đủ rẻ để vận hành lâu dài?
