package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.coach.dto.AdjustmentEvaluationResponse;
import health_assistant.module.coach.dto.PlanAdjustmentDecisionResponse;
import health_assistant.module.coach.dto.PlanAdjustmentResponse;
import health_assistant.module.coach.dto.RoadmapResponse;
import health_assistant.module.coach.entity.PlanAdjustment;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.PlanAdjustmentRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.entity.DailyCheckin;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanAdjustmentService {
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String TRIGGER = "REPEATED_LOW_READINESS";
    private static final String STATUS_PROPOSED = "PROPOSED";

    private final PlanAdjustmentRepository adjustmentRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final DailyCheckinRepository checkinRepository;
    private final UserProfileRepository profileRepository;
    private final RoadmapLifecycleService roadmapLifecycleService;
    private final ObjectMapper objectMapper;

    @Transactional
    public AdjustmentEvaluationResponse evaluate() {
        Long userId = SecurityUtils.getCurrentUserId();
        var profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi đánh giá điều chỉnh."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        RoadmapRecord roadmap = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .orElseThrow(() -> new IllegalArgumentException("Chưa có lộ trình đang hoạt động."));

        PlanAdjustment existing = adjustmentRepository
                .findFirstByUserIdAndRoadmapIdAndStatusOrderByCreatedAtDesc(userId, roadmap.getId(), STATUS_PROPOSED)
                .orElse(null);
        if (existing != null) {
            return new AdjustmentEvaluationResponse(false, "Bạn đã có đề xuất đang chờ xác nhận.", toResponse(existing));
        }

        LocalDate today = LocalDate.now(USER_ZONE);
        LocalDate from = today.minusDays(6);
        List<DailyCheckin> entries = checkinRepository
                .findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, from, today);
        List<DailyCheckin> flagged = entries.stream().filter(this::isLowReadiness).toList();
        if (flagged.size() < 2) {
            return new AdjustmentEvaluationResponse(false,
                    "Chưa đủ dữ liệu check-in gần đây để đề xuất điều chỉnh. Không có thay đổi nào được áp dụng.", null);
        }

        List<String> currentPlan = readStringList(roadmap.getWeeklyPlan(), "lộ trình");
        if (currentPlan.isEmpty() || roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null) {
            throw new IllegalStateException("Lộ trình hiện tại thiếu lịch tuần có cấu trúc để đề xuất điều chỉnh.");
        }
        int currentWeek = currentWeek(roadmap, today);
        List<String> proposedPlan = new ArrayList<>(currentPlan);
        proposedPlan.set(currentWeek, "Tuần %d: giảm tải, ưu tiên phục hồi và vận động nhẹ theo khả năng; không tập bù buổi đã bỏ lỡ."
                .formatted(currentWeek + 1));
        String reason = "%d check-in trong 7 ngày gần nhất ghi nhận năng lượng thấp hoặc mệt mỏi cao. Đây là tín hiệu tự khai báo, không phải đánh giá y khoa."
                .formatted(flagged.size());

        PlanAdjustment adjustment = new PlanAdjustment();
        adjustment.setUserId(userId);
        adjustment.setRoadmapId(roadmap.getId());
        adjustment.setTriggerType(TRIGGER);
        adjustment.setReason(reason);
        adjustment.setProposedChanges(writeChanges(roadmap, currentWeek, flagged, currentPlan, proposedPlan));
        adjustment.setStatus(STATUS_PROPOSED);
        adjustment.setCreatedAt(Instant.now());
        return new AdjustmentEvaluationResponse(true,
                "Đã tạo đề xuất giảm tải ở trạng thái chờ xác nhận. Lộ trình hiện tại chưa bị thay đổi.",
                toResponse(adjustmentRepository.save(adjustment)));
    }

    @Transactional(readOnly = true)
    public List<PlanAdjustmentResponse> history() {
        return adjustmentRepository.findTop10ByUserIdOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public PlanAdjustmentDecisionResponse accept(Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        PlanAdjustment adjustment = adjustmentRepository.findByIdAndUserIdForUpdate(id, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đề xuất của tài khoản này."));
        requireProposed(adjustment);
        JsonNode changes = readChanges(adjustment.getProposedChanges());
        Long baseRoadmapId = requiredLong(changes, "baseRoadmapId");
        List<String> proposedPlan = readArray(changes.path("proposedWeeklyPlan"));

        RoadmapResponse newVersion = roadmapLifecycleService.applyRecoveryAdjustment(baseRoadmapId, proposedPlan);
        adjustment.setStatus("ACCEPTED");
        adjustment.setDecidedAt(Instant.now());
        return new PlanAdjustmentDecisionResponse(toResponse(adjustmentRepository.save(adjustment)), newVersion);
    }

    @Transactional
    public PlanAdjustmentResponse reject(Long id) {
        PlanAdjustment adjustment = adjustmentRepository.findByIdAndUserIdForUpdate(id, SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đề xuất của tài khoản này."));
        requireProposed(adjustment);
        adjustment.setStatus("REJECTED");
        adjustment.setDecidedAt(Instant.now());
        return toResponse(adjustmentRepository.save(adjustment));
    }

    private boolean isLowReadiness(DailyCheckin entry) {
        return (entry.getEnergyLevel() != null && entry.getEnergyLevel() <= 2)
                || (entry.getFatigueLevel() != null && entry.getFatigueLevel() >= 4);
    }

    private int currentWeek(RoadmapRecord roadmap, LocalDate today) {
        long days = ChronoUnit.DAYS.between(roadmap.getStartDate(), today);
        int lastIndex = Math.min(roadmap.getWeeklyPlan() == null ? 0 : readStringList(roadmap.getWeeklyPlan(), "lộ trình").size() - 1,
                roadmap.getDurationWeeks() - 1);
        return (int) Math.max(0, Math.min(days / 7, lastIndex));
    }

    private String writeChanges(RoadmapRecord roadmap, int weekIndex, List<DailyCheckin> flagged,
                                List<String> currentPlan, List<String> proposedPlan) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("schemaVersion", "ROADMAP_ADJUSTMENT_V1");
        root.put("baseRoadmapId", roadmap.getId());
        root.put("baseVersionNumber", roadmap.getVersionNumber());
        root.put("weekIndex", weekIndex);
        ArrayNode evidence = root.putArray("checkinDates");
        flagged.forEach(entry -> evidence.add(entry.getCheckInDate().toString()));
        root.set("currentWeeklyPlan", objectMapper.valueToTree(currentPlan));
        root.set("proposedWeeklyPlan", objectMapper.valueToTree(proposedPlan));
        try {
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu đề xuất điều chỉnh.", exception);
        }
    }

    private List<String> readStringList(String json, String label) {
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            throw new IllegalStateException("Dữ liệu " + label + " không đúng cấu trúc.", exception);
        }
    }

    private JsonNode readChanges(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Đề xuất điều chỉnh đã lưu không hợp lệ.", exception);
        }
    }

    private List<String> readArray(JsonNode node) {
        if (!node.isArray() || node.isEmpty()) throw new IllegalStateException("Phương án tuần không hợp lệ.");
        List<String> values = new ArrayList<>();
        node.forEach(item -> {
            if (!item.isTextual() || item.asText().isBlank() || item.asText().length() > 500) {
                throw new IllegalStateException("Nội dung tuần trong đề xuất không hợp lệ.");
            }
            values.add(item.asText());
        });
        return values;
    }

    private Long requiredLong(JsonNode node, String field) {
        if (!node.path(field).canConvertToLong()) throw new IllegalStateException("Thiếu roadmap gốc trong đề xuất.");
        return node.path(field).longValue();
    }

    private void requireProposed(PlanAdjustment adjustment) {
        if (!STATUS_PROPOSED.equals(adjustment.getStatus())) {
            throw new IllegalStateException("Đề xuất đã được xử lý trước đó.");
        }
    }

    private PlanAdjustmentResponse toResponse(PlanAdjustment adjustment) {
        return new PlanAdjustmentResponse(adjustment.getId(), adjustment.getRoadmapId(), adjustment.getTriggerType(),
                adjustment.getReason(), readChanges(adjustment.getProposedChanges()), adjustment.getStatus(),
                adjustment.getCreatedAt(), adjustment.getDecidedAt());
    }
}
