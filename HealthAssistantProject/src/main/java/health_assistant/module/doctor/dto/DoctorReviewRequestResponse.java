package health_assistant.module.doctor.dto;

import health_assistant.module.doctor.entity.DoctorReviewRequest;
import java.time.Instant;

public record DoctorReviewRequestResponse(Long id, Long userId, Long roadmapId, Long assignedDoctorId,
                                          String decision, String status, String priority, String reason,
                                          String diseaseCodes, String riskSummary, String fullText,
                                          String policyVersion, Instant createdAt, Instant assignedAt,
                                          Instant completedAt) {
    public static DoctorReviewRequestResponse from(DoctorReviewRequest r) { return new DoctorReviewRequestResponse(r.getId(), r.getUserId(), r.getRoadmapId(), r.getAssignedDoctorId(), r.getDecision(), r.getStatus(), r.getPriority(), r.getReason(), r.getDiseaseCodes(), r.getRiskSummary(), r.getFullText(), r.getPolicyVersion(), r.getCreatedAt(), r.getAssignedAt(), r.getCompletedAt()); }
}
