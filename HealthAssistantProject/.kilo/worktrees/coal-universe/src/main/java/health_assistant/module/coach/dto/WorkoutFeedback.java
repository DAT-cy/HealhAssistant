package health_assistant.module.coach.dto;

import java.util.List;

public record WorkoutFeedback(
        String exercise,
        int repetitionCount,
        String phase,
        double jointAngle,
        List<String> corrections,
        boolean confident) {
}
