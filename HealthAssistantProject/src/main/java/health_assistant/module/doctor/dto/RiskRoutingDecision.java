package health_assistant.module.doctor.dto;

public record RiskRoutingDecision(String decision, String reason, Long reviewRequestId, String policyVersion) {}
