package health_assistant.module.workout.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GymSessionStartRequest(@NotNull Long roadmapId, @NotNull Long planSlotId,
                                     @NotBlank @Size(max = 80) String exerciseCode) {}
