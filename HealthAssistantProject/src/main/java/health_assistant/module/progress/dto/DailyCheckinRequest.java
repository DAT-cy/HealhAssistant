package health_assistant.module.progress.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record DailyCheckinRequest(
        @DecimalMin("1.00") @DecimalMax("500.00") BigDecimal weightKg,
        @Min(1) @Max(5) Integer energyLevel,
        @DecimalMin("0.00") @DecimalMax("24.00") BigDecimal sleepHours,
        @Min(1) @Max(5) Integer sleepQuality,
        @Min(1) @Max(5) Integer fatigueLevel,
        @Pattern(regexp = "VERY_GOOD|GOOD|NEUTRAL|LOW|VERY_LOW", message = "Tâm trạng không hợp lệ") String mood,
        @Size(max = 500) String activityNotes,
        @Size(max = 1000) String note) {

    public boolean hasAnyValue() {
        return weightKg != null || energyLevel != null || sleepHours != null || sleepQuality != null
                || fatigueLevel != null || mood != null || hasText(activityNotes) || hasText(note);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
