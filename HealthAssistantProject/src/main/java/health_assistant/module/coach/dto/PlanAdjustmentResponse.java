package health_assistant.module.coach.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public record PlanAdjustmentResponse(Long id, Long roadmapId, String triggerType, String reason,
                                     JsonNode proposedChanges, String status, Instant createdAt,
                                     Instant decidedAt) {
}
