package health_assistant.module.workout.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record GymSessionFinishRequest(@Min(0) @Max(1000) Integer repetitions,
                                      @Min(1) @Max(5) Integer userRating,
                                      @Size(max = 500) String notes,
                                      boolean reportedPain) {}
