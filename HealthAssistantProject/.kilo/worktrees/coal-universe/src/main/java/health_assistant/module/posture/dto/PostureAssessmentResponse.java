package health_assistant.module.posture.dto;

import java.util.List;

public record PostureAssessmentResponse(
        String view,
        boolean reliable,
        double shoulderImbalanceDegrees,
        double pelvicTiltDegrees,
        double forwardHeadDegrees,
        List<String> findings,
        List<String> recommendations) {
}
