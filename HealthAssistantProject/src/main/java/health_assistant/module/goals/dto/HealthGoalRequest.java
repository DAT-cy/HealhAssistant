package health_assistant.module.goals.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record HealthGoalRequest(
        @NotBlank @Pattern(regexp = "WEIGHT_LOSS|WEIGHT_MAINTENANCE|MUSCLE_GAIN") String goalType,
        @Positive BigDecimal startWeightKg,
        @Positive BigDecimal targetWeightKg,
        LocalDate startDate,
        LocalDate targetDate,
        @Size(max = 1000) String notes) {
}
