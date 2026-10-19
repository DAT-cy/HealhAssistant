package health_assistant.module.knowledge.dto;

import java.time.LocalDateTime;

public record KnowledgeAuditResponse(Long id, Long actorId, String action, String details, LocalDateTime createdAt) {}
