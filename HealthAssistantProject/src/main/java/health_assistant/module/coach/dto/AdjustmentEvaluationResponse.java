package health_assistant.module.coach.dto;

public record AdjustmentEvaluationResponse(boolean proposalCreated, String message,
                                           PlanAdjustmentResponse proposal) {
}
