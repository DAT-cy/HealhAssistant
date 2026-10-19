package health_assistant.module.goals.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record HealthGoalStatusRequest(
        @NotBlank @Pattern(regexp = "ACTIVE|PAUSED|COMPLETED|CANCELLED") String status) {
}
