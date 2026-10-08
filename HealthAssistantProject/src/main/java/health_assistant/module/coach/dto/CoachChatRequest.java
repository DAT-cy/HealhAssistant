package health_assistant.module.coach.dto;

import jakarta.validation.constraints.NotBlank;

public record CoachChatRequest(@NotBlank String message) {
}
