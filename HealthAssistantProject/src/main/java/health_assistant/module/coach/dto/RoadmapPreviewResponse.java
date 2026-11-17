package health_assistant.module.coach.dto;

import java.util.List;

public record RoadmapPreviewResponse(String previewId, List<GeminiRoadmapResponse> options,
                                     String routingDecision, Long reviewRequestId, String routingReason) {
    public RoadmapPreviewResponse(String previewId, List<GeminiRoadmapResponse> options) {
        this(previewId, options, "AUTO_ROADMAP", null, null);
    }
}
