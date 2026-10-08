package health_assistant.module.progress.dto;

public record ProgressSummaryResponse(long postureScans, long roadmapsCreated, long workoutSessions,
                                      String source, String message) {
}
