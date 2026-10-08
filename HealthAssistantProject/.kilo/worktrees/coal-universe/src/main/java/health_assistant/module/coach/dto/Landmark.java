package health_assistant.module.coach.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record Landmark(
        @NotNull String name,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") double x,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") double y,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") double z,
        @NotNull @DecimalMin("0.0") @DecimalMax("1.0") double visibility,
        @NotNull Instant timestamp) {
}
