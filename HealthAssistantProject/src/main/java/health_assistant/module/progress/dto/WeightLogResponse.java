package health_assistant.module.progress.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record WeightLogResponse(Long id, LocalDate measuredOn, BigDecimal weightKg, String note, Instant createdAt) {
}
