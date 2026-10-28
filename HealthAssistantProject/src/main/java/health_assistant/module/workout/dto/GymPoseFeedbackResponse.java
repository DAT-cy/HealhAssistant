package health_assistant.module.workout.dto;

import java.time.Instant;
import java.util.List;

public record GymPoseFeedbackResponse(Long sessionId, String confidence, boolean visibleBody,
                                      boolean safetyConcern, String feedback, List<String> corrections,
                                      String nextStep, Integer repetitionsObserved, String measurementMode,
                                      Instant analyzedAt, int analysesRemaining) {}
