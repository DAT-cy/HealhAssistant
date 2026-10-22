package health_assistant.module.dailyplan.dto;

import java.util.List;

public record DailyPlanResponse(String date, String title, String duration, List<String> activities,
                                List<String> safetyNotes, String source, String scheduledStart,
                                String scheduledEnd, String activityType, String locationType) {
}
