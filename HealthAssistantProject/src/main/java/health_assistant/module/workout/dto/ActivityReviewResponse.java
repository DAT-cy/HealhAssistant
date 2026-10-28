package health_assistant.module.workout.dto;

import java.util.List;

public record ActivityReviewResponse(String summary, List<String> observations, List<String> suggestions,
                                     String progressionNote, boolean enoughEvidence, String source) {}
