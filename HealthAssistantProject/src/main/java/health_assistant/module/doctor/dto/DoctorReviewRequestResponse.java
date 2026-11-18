package health_assistant.module.doctor.dto;

import com.fasterxml.jackson.databind.JsonNode;
import health_assistant.module.doctor.entity.DoctorReview;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import java.time.Instant;

/**
 * Yêu cầu bác sĩ kiểm tra.
 * doctorNote / lastAction / decidedAt: quyết định gần nhất của bác sĩ (null nếu chưa có).
 * aiPlan: 3 phương án AI đề xuất để bác sĩ duyệt (null với yêu cầu cũ).
 */
public record DoctorReviewRequestResponse(Long id, Long userId, Long roadmapId, Long assignedDoctorId,
                                          String decision, String status, String priority, String reason,
                                          String diseaseCodes, String riskSummary, String fullText,
                                          String policyVersion, Instant createdAt, Instant assignedAt,
                                          Instant completedAt, String doctorNote, String lastAction,
                                          Instant decidedAt, JsonNode aiPlan, String userReply,
                                          Long previousRequestId, Instant appliedAt) {
    public static DoctorReviewRequestResponse from(DoctorReviewRequest r) { return from(r, null, null); }

    public static DoctorReviewRequestResponse from(DoctorReviewRequest r, DoctorReview latest, JsonNode aiPlan) {
        return new DoctorReviewRequestResponse(r.getId(), r.getUserId(), r.getRoadmapId(), r.getAssignedDoctorId(), r.getDecision(), r.getStatus(), r.getPriority(), r.getReason(), r.getDiseaseCodes(), r.getRiskSummary(), r.getFullText(), r.getPolicyVersion(), r.getCreatedAt(), r.getAssignedAt(), r.getCompletedAt(),
                latest == null ? null : latest.getNote(), latest == null ? null : latest.getAction(), latest == null ? null : latest.getCreatedAt(),
                aiPlan, r.getUserReply(), r.getPreviousRequestId(), r.getAppliedAt());
    }
}
