package health_assistant.module.coach.dto;

import java.util.List;

public record DailyReviewChanges(Long baseRoadmapId, Integer baseVersionNumber,
                                 List<DailyScheduleChange> scheduleChanges) {}
