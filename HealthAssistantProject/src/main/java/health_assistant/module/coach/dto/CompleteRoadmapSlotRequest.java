package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CompleteRoadmapSlotRequest(
        @Min(1) @Max(1440) Integer actualDurationMinutes,
        @Size(max = 500) String notes) {}
