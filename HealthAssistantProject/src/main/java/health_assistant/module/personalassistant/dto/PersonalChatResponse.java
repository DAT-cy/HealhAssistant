package health_assistant.module.personalassistant.dto;

import java.time.Instant;
import java.util.List;

public record PersonalChatResponse(String threadId, String answer, String source,
                                   boolean safetyEscalation, List<PersonalAssistantSource> sources,
                                   boolean usedPersonalInstructions, Instant createdAt) {}
