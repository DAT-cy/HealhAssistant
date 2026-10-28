package health_assistant.module.coach.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record DailyAiReviewResponse(Long id, LocalDate reviewDate, Long roadmapId, String status,
                                    String summary, List<String> achievedGoals, List<String> incompleteActivities,
                                    List<String> workloadAssessment, List<String> missingData,
                                    boolean needsScheduleAdjustment, List<String> reasons,
                                    List<String> suggestions, String recommendation, DailyReviewChanges proposedChanges,
                                    boolean confirmationRequired, String source, Instant createdAt,
                                    Instant decidedAt, Long appliedRoadmapId) {}
