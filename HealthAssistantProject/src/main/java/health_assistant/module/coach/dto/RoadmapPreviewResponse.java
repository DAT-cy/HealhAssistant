package health_assistant.module.coach.dto;

import java.util.List;

public record RoadmapPreviewResponse(String previewId, List<GeminiRoadmapResponse> options) { }
