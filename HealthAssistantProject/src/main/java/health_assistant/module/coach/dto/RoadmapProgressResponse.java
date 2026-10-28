package health_assistant.module.coach.dto;

public record RoadmapProgressResponse(Long roadmapId, String status, int durationDays, int totalSlots, int upcoming,
                                      int inProgress, int completed, int skipped, int cancelled,
                                      int completedDays, int totalActiveDays, int progressPercent) {}
