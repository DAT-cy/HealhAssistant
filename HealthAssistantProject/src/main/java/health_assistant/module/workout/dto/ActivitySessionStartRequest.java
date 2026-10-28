package health_assistant.module.workout.dto;

import jakarta.validation.constraints.NotNull;

public record ActivitySessionStartRequest(@NotNull Long roadmapId, @NotNull Long planSlotId) {}
