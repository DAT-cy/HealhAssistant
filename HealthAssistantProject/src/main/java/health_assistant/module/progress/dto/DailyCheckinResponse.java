package health_assistant.module.progress.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record DailyCheckinResponse(Long id, LocalDate checkInDate, BigDecimal weightKg,
                                  Integer energyLevel, BigDecimal sleepHours, Integer sleepQuality,
                                  Integer fatigueLevel, String mood, String activityNotes, String note,
                                  Instant createdAt, Instant updatedAt) {
}
