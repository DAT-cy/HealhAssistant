package health_assistant.module.progress.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyCheckinSummaryResponse(LocalDate from, LocalDate to, long checkinCount,
                                         BigDecimal averageEnergyLevel, BigDecimal averageSleepHours,
                                         BigDecimal averageSleepQuality, BigDecimal averageFatigueLevel,
                                         BigDecimal firstWeightKg, BigDecimal latestWeightKg,
                                         BigDecimal weightChangeKg) {
}
