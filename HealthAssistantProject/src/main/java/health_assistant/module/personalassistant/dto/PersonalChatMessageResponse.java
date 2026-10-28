package health_assistant.module.personalassistant.dto;

import java.time.Instant;
import java.util.List;

public record PersonalChatMessageResponse(Long id, String role, String content,
                                          List<PersonalAssistantSource> sources,
                                          String responseSource, Instant createdAt) {}
