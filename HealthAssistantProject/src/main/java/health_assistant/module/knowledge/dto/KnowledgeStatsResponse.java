package health_assistant.module.knowledge.dto;

public record KnowledgeStatsResponse(long total, long awaitingReview, long approved, long rejected) {}
