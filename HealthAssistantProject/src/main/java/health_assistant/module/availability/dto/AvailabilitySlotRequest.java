package health_assistant.module.availability.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record AvailabilitySlotRequest(
        @Min(1) @Max(7) int dayOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotBlank @Pattern(regexp = "WORKOUT|WALKING|MOBILITY|OTHER") String activityType,
        @NotBlank @Pattern(regexp = "HOME|GYM|OUTDOOR|ANYWHERE") String locationType,
        @Size(max = 500) String equipmentNotes) {
}
