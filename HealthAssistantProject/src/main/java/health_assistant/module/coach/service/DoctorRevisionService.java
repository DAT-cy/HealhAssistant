package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.controller.GeminiCoachController;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapSlotRequest;
import health_assistant.module.doctor.dto.RevisionRequestedEvent;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DoctorReviewRepository;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import health_assistant.module.doctor.service.DiseaseRiskAssessmentService;
import health_assistant.module.profile.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Bác sĩ "Yêu cầu sửa" → AI tính lại 3 phương án theo nhận xét (dùng hồ sơ + lịch đã lưu),
 * tạo phiên bản yêu cầu mới (previousRequestId) và gửi lại đúng bác sĩ đó để duyệt lại.
 * Người dùng không phải tạo lại lộ trình.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorRevisionService {
    private final DoctorReviewRequestRepository requestRepository;
    private final DoctorReviewRepository reviewRepository;
    private final UserProfileRepository profileRepository;
    private final GeminiCoachService geminiCoachService;
    private final DiseaseRiskAssessmentService riskService;
    private final ObjectMapper objectMapper;

    /** Chạy sau khi quyết định của bác sĩ đã lưu; gọi AI trên luồng riêng để bác sĩ không phải chờ. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRevisionRequested(RevisionRequestedEvent event) {
        log.info("Bác sĩ yêu cầu sửa #{} → AI bắt đầu tính lại", event.requestId());
        Thread.ofVirtual().name("doctor-revision-" + event.requestId()).start(() -> {
            try {
                regenerate(event.requestId());
            } catch (Throwable exception) {
                log.warn("AI chưa tính lại được yêu cầu #{} ({}: {}). Người dùng có thể tạo lại lộ trình để thử lại.",
                        event.requestId(), exception.getClass().getSimpleName(), exception.getMessage());
            }
        });
    }

    /** @return id yêu cầu mới, hoặc empty nếu không cần / không thể tính lại. */
    public Optional<Long> regenerate(Long requestId) {
        DoctorReviewRequest previous = requestRepository.findById(requestId).orElse(null);
        if (previous == null || !"REVISION_REQUESTED".equals(previous.getStatus())) {
            log.info("Bỏ qua tính lại #{}: trạng thái hiện tại {}", requestId, previous == null ? "không tồn tại" : previous.getStatus());
            return Optional.empty();
        }
        String note = reviewRepository.findFirstByRequestIdOrderByCreatedAtDescIdDesc(requestId)
                .map(review -> review.getNote()).filter(value -> value != null && !value.isBlank()).orElse("");
        var profile = profileRepository.findByUserId(previous.getUserId()).orElse(null);
        List<String> codes = previous.getDiseaseCodes() == null ? List.of()
                : Arrays.stream(previous.getDiseaseCodes().split(",")).map(String::trim).filter(c -> !c.isEmpty()).toList();
        var assessment = riskService.assess(codes);
        if (assessment.auto()) {
            log.info("Yêu cầu #{}: chính sách bệnh đã đổi, không còn cần bác sĩ → bỏ qua tính lại.", requestId);
            return Optional.empty();
        }
        String goal = profile == null || profile.getGoal() == null || profile.getGoal().isBlank() ? "Duy trì sức khoẻ" : profile.getGoal();
        String measurements = profile == null ? "" : GeminiCoachController.measurements(profile);
        String restrictions = profile == null ? "" : GeminiCoachController.joinNonBlank("; ", profile.getRestrictions(), profile.getPainAreas());
        String feedback = note.isBlank() ? null : "Bác sĩ yêu cầu điều chỉnh phương án trước: " + note.trim();
        List<RoadmapSlotRequest> schedule = readSchedule(previous.getScheduleJson());
        int weeks = weeksOf(previous.getAiPlanJson());
        var request = new GeminiRoadmapRequest(goal, weeks, measurements,
                GeminiCoachController.joinNonBlank("; ", feedback, restrictions), schedule, codes);
        List<GeminiRoadmapResponse> options = geminiCoachService.planOptions(request);
        var routing = riskService.submit(previous.getUserId(), null, assessment, previous.getFullText(),
                write(options), previous.getScheduleJson(), previous);
        log.info("Yêu cầu #{} đã được AI tính lại theo nhận xét bác sĩ → yêu cầu mới #{}", requestId, routing.reviewRequestId());
        return Optional.ofNullable(routing.reviewRequestId());
    }

    /** Số tuần lấy theo phương án cũ (1–12), mặc định 4. */
    int weeksOf(String aiPlanJson) {
        try {
            if (aiPlanJson != null && !aiPlanJson.isBlank()) {
                List<GeminiRoadmapResponse> options = objectMapper.readValue(aiPlanJson, new TypeReference<>() { });
                if (!options.isEmpty() && options.get(0).weeklyPlan() != null && !options.get(0).weeklyPlan().isEmpty())
                    return Math.max(1, Math.min(12, options.get(0).weeklyPlan().size()));
            }
        } catch (Exception ignored) { /* dùng mặc định */ }
        return 4;
    }

    private List<RoadmapSlotRequest> readSchedule(String json) {
        try { return json == null || json.isBlank() ? List.of() : objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (Exception exception) { return List.of(); }
    }

    private String write(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception exception) { throw new IllegalStateException("Không lưu được phương án AI.", exception); }
    }
}
