package health_assistant.module.coach.dto;

import java.util.List;

public record GeminiRoadmapResponse(
        String title,
        String overview,
        List<String> weeklyPlan,
        List<String> safetyNotes,
        String source,
        List<RoadmapReference> references) {

    /** Giữ tương thích với code cũ (chưa có nguồn tham khảo). */
    public GeminiRoadmapResponse(String title, String overview, List<String> weeklyPlan, List<String> safetyNotes, String source) {
        this(title, overview, weeklyPlan, safetyNotes, source, List.of());
    }

    public GeminiRoadmapResponse withReferences(List<RoadmapReference> refs) {
        return new GeminiRoadmapResponse(title, overview, weeklyPlan, safetyNotes, source, refs == null ? List.of() : List.copyOf(refs));
    }
}
