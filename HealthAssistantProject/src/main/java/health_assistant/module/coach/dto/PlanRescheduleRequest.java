package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record PlanRescheduleRequest(
        @NotNull Long roadmapId,
        @NotBlank @Pattern(regexp = "SINGLE_SLOT|DAY|REMAINING_DAYS|NEW_VERSION") String scope,
        @NotNull LocalDate targetDate,
        Long targetSlotId,
        @Size(max = 120) String goal,
        @Size(max = 1200) String naturalLanguageRequest,
        List<@Min(1) @Max(7) Integer> availableWeekdays,
        LocalTime preferredStartTime,
        LocalTime preferredEndTime,
        @Size(max = 500) String preferredTimeWindows,
        @Size(max = 500) String desiredActivityTypes,
        @Min(15) @Max(240) Integer durationMinutes,
        @Size(max = 300) String unavailableActivities,
        @Size(max = 300) String equipmentOrLocation,
        @Size(max = 500) String healthLimits,
        @NotBlank @Size(max = 300) String reason) {}
