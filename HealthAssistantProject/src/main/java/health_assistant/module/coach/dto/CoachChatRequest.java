package health_assistant.module.coach.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CoachChatRequest(@NotBlank @Size(max = 2000) String message) {
}
