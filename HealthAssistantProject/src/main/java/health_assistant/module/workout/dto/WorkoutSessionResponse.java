package health_assistant.module.workout.dto;

import java.time.Instant;
import java.util.List;

public record WorkoutSessionResponse(Long id, Long planSlotId, String exerciseCode, String status,
                                     Instant startedAt, Instant completedAt, Long durationSeconds,
                                     int repetitions, String repetitionSource, Integer userRating,
                                     String notes, int aiAnalysisCount, List<GymPoseFeedbackResponse> aiFeedback) {}
