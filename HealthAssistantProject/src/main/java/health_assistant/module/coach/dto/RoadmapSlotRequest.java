package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record RoadmapSlotRequest(
        @NotNull @Min(1) @Max(7) Integer dayOfWeek,
        @NotBlank @Pattern(regexp = "MORNING|AFTERNOON|EVENING") String sessionPeriod,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @NotBlank @Pattern(regexp = "RUNNING|GYM|WALKING|STRENGTH|MOBILITY|OTHER") String activityType,
        @NotBlank @Size(max = 100) String activity) {}
