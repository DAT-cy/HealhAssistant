package health_assistant.module.personalassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PersonalChatRequest(@NotBlank @Size(max = 2000) String message,
                                  @Size(max = 36) String threadId,
                                  boolean allowGeneralKnowledge) {}
