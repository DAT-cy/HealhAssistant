package health_assistant.module.coach.dto;

import java.util.List;

public record GeminiRoadmapResponse(
        String title,
        String overview,
        List<String> weeklyPlan,
        List<String> safetyNotes,
        String source) {
}
