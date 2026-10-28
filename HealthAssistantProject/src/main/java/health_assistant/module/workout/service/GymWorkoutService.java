package health_assistant.module.workout.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.ai.service.AiPromptSanitizer;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.dto.ExerciseCatalogResponse;
import health_assistant.module.workout.dto.GymPoseFeedbackResponse;
import health_assistant.module.workout.dto.GymSessionFinishRequest;
import health_assistant.module.workout.dto.WorkoutSessionResponse;
import health_assistant.module.workout.entity.ExerciseCatalog;
import health_assistant.module.workout.entity.WorkoutSession;
import health_assistant.module.workout.repository.ExerciseCatalogRepository;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class GymWorkoutService {
    public static final String PREMIUM_FEATURE = "AI_GYM_CAMERA";
    private static final int MAX_PHOTO_ANALYSES = 10;
    private static final long PHOTO_COOLDOWN_SECONDS = 5;
    private static final Set<String> ALLOWED_SLOT_TYPES = Set.of("GYM", "STRENGTH", "MOBILITY", "OTHER");

    private final ExerciseCatalogRepository exerciseRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final UserProfileRepository profileRepository;
    private final CloudinaryUploadService imageValidator;
    private final FeatureAccessService featureAccess;
    private final GeminiClient gemini;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public List<ExerciseCatalogResponse> exercises() {
        return exerciseRepository.findAllByActiveTrueOrderByNameAsc().stream().map(this::toExerciseResponse).toList();
    }

    @Transactional
    public WorkoutSessionResponse start(Long userId, Long roadmapId, Long slotId, String exerciseCode) {
        RoadmapRecord roadmap = ownedActiveRoadmap(userId, roadmapId);
        RoadmapPlanSlot slot = ownedSlotForUpdate(roadmapId, slotId);
        String slotStatus = normalize(slot.getStatus());
        if (!"UPCOMING".equals(slotStatus) && !"IN_PROGRESS".equals(slotStatus)) throw new IllegalArgumentException("Khung giờ này đã kết thúc.");
        if (!ALLOWED_SLOT_TYPES.contains(slot.getActivityType())) throw new IllegalArgumentException("Khung giờ này không phải hoạt động gym được hỗ trợ.");
        ExerciseCatalog exercise = exerciseRepository.findByCodeAndActiveTrue(exerciseCode)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy bài tập đang hoạt động."));
        WorkoutSession active = sessionRepository.findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc(slotId, List.of("IN_PROGRESS"))
                .orElse(null);
        if (active != null) return toResponse(active);

        Instant now = Instant.now();
        WorkoutSession session = new WorkoutSession();
        session.setUserId(userId);
        session.setExercise(exercise.getCode());
        session.setReps(0);
        session.setRepsSource("NOT_MEASURED");
        session.setPlanSlotId(slotId);
        session.setRoadmapId(roadmapId);
        session.setStartedAt(now);
        session.setStatus("IN_PROGRESS");
        session.setCompletedAt(null);
        slot.setStatus("IN_PROGRESS");
        if (slot.getStartedAt() == null) slot.setStartedAt(now);
        slotRepository.saveAndFlush(slot);
        return toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional
    public GymPoseFeedbackResponse analyzePhoto(Long userId, Long sessionId, MultipartFile image, String cameraFacing) {
        WorkoutSession session = lockOwnedSession(userId, sessionId);
        featureAccess.requireFeature(userId, PREMIUM_FEATURE);
        if (!"IN_PROGRESS".equals(session.getStatus())) throw new IllegalArgumentException("Buổi tập không còn mở để phân tích ảnh.");
        if (!"front".equals(cameraFacing) && !"back".equals(cameraFacing)) throw new IllegalArgumentException("Loại camera không hợp lệ.");
        if (session.getAiAnalysisCount() >= MAX_PHOTO_ANALYSES) throw new IllegalArgumentException("Đã đạt giới hạn 10 lần phân tích ảnh trong buổi tập này.");
        if (session.getLastAiAnalysisAt() != null && Duration.between(session.getLastAiAnalysisAt(), Instant.now()).toSeconds() < PHOTO_COOLDOWN_SECONDS) {
            throw new IllegalArgumentException("Vui lòng đợi vài giây trước khi gửi ảnh tiếp theo.");
        }
        imageValidator.validateImageFile(image);
        if (!gemini.isConfigured()) throw new IllegalStateException("Dịch vụ AI hiện chưa được cấu hình.");

        ExerciseCatalog exercise = exerciseRepository.findByCodeAndActiveTrue(session.getExercise())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy hướng dẫn bài tập."));
        RoadmapPlanSlot slot = ownedSlotForUpdate(session.getRoadmapId(), session.getPlanSlotId());
        RoadmapRecord roadmap = ownedActiveRoadmap(userId, session.getRoadmapId());
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);

        // Reserve the rate-limit slot before the external request so failed/retried calls cannot be spammed.
        session.setAiAnalysisCount(session.getAiAnalysisCount() + 1);
        session.setLastAiAnalysisAt(Instant.now());
        sessionRepository.saveAndFlush(session);
        try {
            JsonNode result = mapper.readTree(gemini.generateJson(prompt(exercise, slot, roadmap, profile, cameraFacing), schema(),
                    image.getContentType(), java.util.Base64.getEncoder().encodeToString(image.getBytes())));
            String confidence = enumValue(result, "confidence", Set.of("LOW", "MEDIUM", "HIGH"));
            boolean visibleBody = result.path("visibleBody").asBoolean(false);
            boolean safetyConcern = result.path("safetyConcern").asBoolean(false);
            String feedback = requiredText(result, "feedback", 400);
            List<String> corrections = stringList(result.path("corrections"), 4, 180);
            String nextStep = requiredText(result, "nextStep", 220);
            if (!visibleBody || "LOW".equals(confidence)) {
                feedback = "Ảnh chưa đủ góc hoặc chưa thấy rõ cơ thể để nhận xét đáng tin cậy.";
                corrections = List.of("Đặt máy cố định, để toàn thân và dụng cụ trong khung hình, đủ sáng rồi chụp lại.");
            }
            if (safetyConcern) nextStep = "Dừng động tác nếu đang đau hoặc thấy không an toàn; không cố tập tiếp.";
            GymPoseFeedbackResponse response = new GymPoseFeedbackResponse(sessionId, confidence, visibleBody, safetyConcern, feedback, corrections,
                    nextStep, null, "SINGLE_PHOTO_NO_REP_MEASUREMENT", Instant.now(), MAX_PHOTO_ANALYSES - session.getAiAnalysisCount());
            List<GymPoseFeedbackResponse> history = readFeedback(session.getAiFeedback());
            history.add(response);
            session.setAiFeedback(writeFeedback(history));
            sessionRepository.saveAndFlush(session);
            return response;
        } catch (Exception exception) {
            log.warn("Gym photo analysis failed ({})", exception.getClass().getSimpleName());
            if (exception instanceof IllegalArgumentException illegalArgumentException) throw illegalArgumentException;
            throw new IllegalStateException("Không thể phân tích ảnh tư thế lúc này. Buổi tập vẫn được giữ.");
        }
    }

    @Transactional
    public WorkoutSessionResponse finish(Long userId, Long sessionId, GymSessionFinishRequest request) {
        WorkoutSession session = lockOwnedSession(userId, sessionId);
        if ("COMPLETED".equals(session.getStatus()) || "CANCELLED".equals(session.getStatus())) return toResponse(session);
        if (!"IN_PROGRESS".equals(session.getStatus())) throw new IllegalArgumentException("Buổi tập không ở trạng thái đang tập.");
        RoadmapPlanSlot slot = ownedSlotForUpdate(session.getRoadmapId(), session.getPlanSlotId());
        Instant endedAt = Instant.now();
        long seconds = Math.max(0, Duration.between(session.getStartedAt(), endedAt).toSeconds());
        session.setDurationSeconds(seconds);
        session.setCompletedAt(endedAt);
        session.setUserRating(request.userRating());
        session.setNotes(blankToNull(request.notes()));
        if (request.reportedPain()) {
            session.setStatus("CANCELLED");
            session.setReps(0);
            session.setRepsSource("NOT_MEASURED");
            slot.setStatus("SKIPPED");
            slot.setSkipReason("Người dùng báo đau hoặc cần dừng vì an toàn.");
        } else {
            session.setStatus("COMPLETED");
            session.setReps(request.repetitions() == null ? 0 : request.repetitions());
            session.setRepsSource(request.repetitions() == null ? "NOT_MEASURED" : "USER_ENTRY");
            slot.setStatus("COMPLETED");
            slot.setCompletedAt(endedAt);
            slot.setActualDurationMinutes(Math.toIntExact((seconds + 59) / 60));
            slot.setNotes(blankToNull(request.notes()));
        }
        slotRepository.saveAndFlush(slot);
        return toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionResponse> history(Long userId, Long slotId) {
        RoadmapPlanSlot slot = slotRepository.findByIdAndUserId(slotId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung giờ trong tài khoản này."));
        return sessionRepository.findTop10ByPlanSlotIdAndUserIdOrderByStartedAtDesc(slot.getId(), userId)
                .stream().map(this::toResponse).toList();
    }

    private String prompt(ExerciseCatalog exercise, RoadmapPlanSlot slot, RoadmapRecord roadmap, UserProfile profile, String facing) {
        String restrictions = profile == null ? "" : String.join("; ",
                profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                profile.getPainAreas() == null ? "" : profile.getPainAreas());
        return """
                Bạn là coach vận động phổ thông trong ứng dụng thể dục. Phân tích DUY NHẤT ảnh tĩnh được gửi, không tuyên bố đang xem video hay theo dõi realtime.
                Trả lời ngắn gọn bằng tiếng Việt. Dựa vào hướng dẫn bài tập và mục tiêu; nếu cơ thể, góc khớp hoặc vùng liên quan không rõ, trả confidence LOW và yêu cầu đặt lại camera.
                Không suy đoán góc khớp chính xác, không đếm repetitions từ một ảnh, không chẩn đoán. Không hướng dẫn tiếp tục nếu thấy dấu hiệu không an toàn; người dùng phải dừng nếu đau.
                Chỉ nhận xét những gì quan sát được; khung hình tĩnh không chứng minh chuyển động/form xuyên suốt.
                Bài tập: %s (%s), nhóm cơ: %s, thiết bị: %s.
                Hướng dẫn đã duyệt trong catalog: %s
                Lưu ý an toàn: %s
                Mục tiêu roadmap: %s
                Giới hạn người dùng tự khai báo: %s
                Camera hướng: %s
                """.formatted(AiPromptSanitizer.sanitize(exercise.getName(), 160), AiPromptSanitizer.sanitize(exercise.getCode(), 80),
                AiPromptSanitizer.sanitize(exercise.getMuscleGroup(), 80), AiPromptSanitizer.sanitize(exercise.getEquipment(), 120),
                AiPromptSanitizer.sanitize(exercise.getInstructions(), 1000), AiPromptSanitizer.sanitize(exercise.getSafetyNotes(), 500),
                AiPromptSanitizer.sanitize(roadmap.getTitle() + " " + roadmap.getOverview(), 700),
                AiPromptSanitizer.sanitize(restrictions, 500), facing);
    }

    private JsonNode schema() {
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties");
        properties.putObject("confidence").put("type", "STRING").putArray("enum").add("LOW").add("MEDIUM").add("HIGH");
        properties.putObject("visibleBody").put("type", "BOOLEAN");
        properties.putObject("safetyConcern").put("type", "BOOLEAN");
        properties.putObject("feedback").put("type", "STRING");
        properties.putObject("corrections").put("type", "ARRAY").putObject("items").put("type", "STRING");
        properties.putObject("nextStep").put("type", "STRING");
        schema.putArray("required").add("confidence").add("visibleBody").add("safetyConcern").add("feedback").add("corrections").add("nextStep");
        return schema;
    }

    private RoadmapRecord ownedActiveRoadmap(Long userId, Long roadmapId) {
        RoadmapRecord roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (!"ACTIVE".equals(roadmap.getStatus())) throw new IllegalArgumentException("Lộ trình không còn hoạt động.");
        return roadmap;
    }

    private RoadmapPlanSlot ownedSlotForUpdate(Long roadmapId, Long slotId) {
        return slotRepository.findByIdAndRoadmapIdForUpdate(slotId, roadmapId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung tập của lộ trình."));
    }

    private WorkoutSession lockOwnedSession(Long userId, Long sessionId) {
        return sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy buổi tập của tài khoản này."));
    }

    private ExerciseCatalogResponse toExerciseResponse(ExerciseCatalog exercise) {
        return new ExerciseCatalogResponse(exercise.getId(), exercise.getCode(), exercise.getName(), exercise.getMuscleGroup(),
                exercise.getDifficulty(), exercise.getEquipment(), exercise.getInstructions(), exercise.getSafetyNotes());
    }

    private WorkoutSessionResponse toResponse(WorkoutSession session) {
        return new WorkoutSessionResponse(session.getId(), session.getPlanSlotId(), session.getExercise(), session.getStatus(),
                session.getStartedAt(), session.getCompletedAt(), session.getDurationSeconds(), session.getReps(),
                session.getRepsSource(), session.getUserRating(), session.getNotes(), session.getAiAnalysisCount(), readFeedback(session.getAiFeedback()));
    }

    private List<GymPoseFeedbackResponse> readFeedback(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try { return mapper.readValue(json, new TypeReference<>() {}); }
        catch (JsonProcessingException ignored) { return new ArrayList<>(); }
    }

    private String writeFeedback(List<GymPoseFeedbackResponse> feedback) {
        try { return mapper.writeValueAsString(feedback); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Không thể lưu nhận xét buổi tập.", exception); }
    }

    private String requiredText(JsonNode node, String field, int max) {
        String value = node.path(field).asText("").trim();
        if (value.isBlank() || value.length() > max) throw new IllegalArgumentException("Kết quả phân tích tư thế không hợp lệ.");
        return value;
    }

    private String enumValue(JsonNode node, String field, Set<String> values) {
        String value = node.path(field).asText("");
        if (!values.contains(value)) throw new IllegalArgumentException("Độ tin cậy AI không hợp lệ.");
        return value;
    }

    private List<String> stringList(JsonNode node, int maxCount, int maxLength) {
        List<String> result = new ArrayList<>();
        if (node.isArray()) node.forEach(value -> {
            if (result.size() < maxCount && value.isTextual() && !value.asText().isBlank() && value.asText().length() <= maxLength) result.add(value.asText());
        });
        return result;
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private String normalize(String status) { return "PLANNED".equals(status) ? "UPCOMING" : status; }
}
