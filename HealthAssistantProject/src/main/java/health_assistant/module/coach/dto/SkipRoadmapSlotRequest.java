package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Size;

public record SkipRoadmapSlotRequest(@Size(max = 300) String reason) {}
