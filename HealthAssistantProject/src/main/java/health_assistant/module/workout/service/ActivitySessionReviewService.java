package health_assistant.module.workout.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.ai.service.AiPromptSanitizer;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.dto.ActivityReviewResponse;
import health_assistant.module.workout.entity.ActivitySession;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivitySessionReviewService {
    private final ActivitySessionRepository sessions;
    private final RoadmapRecordRepository roadmaps;
    private final UserProfileRepository profiles;
    private final GeminiClient gemini;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public ActivityReviewResponse review(Long sessionId) {
        Long userId = SecurityUtils.getCurrentUserId();
        ActivitySession session = sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phiên hoạt động của tài khoản này."));
        if (!"COMPLETED".equals(session.getStatus())) throw new IllegalArgumentException("Chỉ có thể đánh giá hoạt động đã hoàn thành.");
        RoadmapRecord roadmap = roadmaps.findByIdAndUserId(session.getRoadmapId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (!gemini.isConfigured()) {
            return new ActivityReviewResponse("Hoạt động đã được lưu vào tiến độ lộ trình.", List.of(),
                    List.of("Duy trì nhịp độ phù hợp và nghỉ nếu thấy đau hoặc khó chịu."),
                    "Chưa có đánh giá AI; không tự tăng cường độ.", false, "FALLBACK");
        }
        UserProfile profile = profiles.findByUserId(userId).orElse(null);
        try {
            JsonNode result = mapper.readTree(gemini.generateJson(prompt(session, roadmap, profile), schema()));
            return new ActivityReviewResponse(requiredText(result, "summary", 500), textList(result.path("observations"), 4, 220),
                    textList(result.path("suggestions"), 4, 240), requiredText(result, "progressionNote", 300),
                    result.path("enoughEvidence").asBoolean(false), "GEMINI");
        } catch (Exception exception) {
            return new ActivityReviewResponse("Hoạt động đã được lưu vào tiến độ lộ trình.", List.of(),
                    List.of("Duy trì nhịp độ phù hợp và nghỉ nếu thấy đau hoặc khó chịu."),
                    "Chưa đủ cơ sở để đề xuất tăng cường độ.", false, "FALLBACK");
        }
    }

    private String prompt(ActivitySession session, RoadmapRecord roadmap, UserProfile profile) {
        return """
                Bạn là trợ lý đánh giá hoạt động thể chất phổ thông. Trả lời bằng tiếng Việt.
                Nhận xét dựa trên kết quả phiên và mục tiêu lộ trình. Chỉ mô tả dữ liệu được cung cấp; số bước/quãng đường có thể thiếu hoặc ước tính.
                Không chẩn đoán, không kết luận thể lực y khoa. Tuyệt đối không tự đề xuất tăng cường độ chỉ vì một phiên đạt chỉ số tốt. Chỉ nêu tăng tiến từ từ nếu có nhiều tuần dữ liệu đủ tin cậy; nếu chưa đủ, phải nói chưa đủ bằng chứng.
                Mục tiêu lộ trình: %s
                Nội dung tuần: %s
                Giới hạn hồ sơ: %s
                Hoạt động: %s (%s), thời lượng thực tế giây: %s, quãng đường mét: %s (nguồn %s), số bước: %s (nguồn %s), tốc độ km/h: %s, pace giây/km: %s.
                Ghi chú người dùng: %s
                """.formatted(AiPromptSanitizer.sanitize(profile == null ? "" : profile.getGoal(), 120),
                AiPromptSanitizer.sanitize(roadmap.getWeeklyPlan(), 1000),
                AiPromptSanitizer.sanitize(profile == null ? "" : String.join("; ",
                        profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                        profile.getPainAreas() == null ? "" : profile.getPainAreas()), 400),
                AiPromptSanitizer.sanitize(session.getActivityType(), 20), AiPromptSanitizer.sanitize(roadmap.getTitle(), 120),
                session.getDurationSeconds(), session.getDistanceMeters(), session.getDistanceSource(), session.getSteps(),
                session.getStepsSource(), session.getAverageSpeedKmh(), session.getPaceSecondsPerKm(),
                AiPromptSanitizer.sanitize(session.getNotes(), 300));
    }

    private JsonNode schema() {
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties");
        properties.putObject("summary").put("type", "STRING");
        properties.putObject("observations").put("type", "ARRAY").putObject("items").put("type", "STRING");
        properties.putObject("suggestions").put("type", "ARRAY").putObject("items").put("type", "STRING");
        properties.putObject("progressionNote").put("type", "STRING");
        properties.putObject("enoughEvidence").put("type", "BOOLEAN");
        schema.putArray("required").add("summary").add("observations").add("suggestions").add("progressionNote").add("enoughEvidence");
        return schema;
    }

    private String requiredText(JsonNode node, String field, int max) {
        String value = node.path(field).asText("").trim();
        if (value.isBlank() || value.length() > max) throw new IllegalArgumentException("Invalid activity review.");
        return value;
    }

    private List<String> textList(JsonNode node, int count, int max) {
        List<String> values = new ArrayList<>();
        if (node.isArray()) node.forEach(item -> {
            if (values.size() < count && item.isTextual() && !item.asText().isBlank() && item.asText().length() <= max) values.add(item.asText());
        });
        return values;
    }
}
