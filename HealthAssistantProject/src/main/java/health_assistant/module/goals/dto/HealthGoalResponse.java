package health_assistant.module.goals.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record HealthGoalResponse(
        Long id,
        Long userId,
        String goalType,
        BigDecimal startWeightKg,
        BigDecimal targetWeightKg,
        LocalDate startDate,
        LocalDate targetDate,
        String status,
        String notes,
        Instant createdAt,
        Instant updatedAt) {
}
