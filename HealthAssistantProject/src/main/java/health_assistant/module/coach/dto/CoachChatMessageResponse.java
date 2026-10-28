package health_assistant.module.coach.dto;

import health_assistant.module.personalassistant.dto.PersonalAssistantSource;

import java.time.Instant;
import java.util.List;

public record CoachChatMessageResponse(Long id, String role, String message, String source,
                                       List<PersonalAssistantSource> sources, Instant createdAt) {}
