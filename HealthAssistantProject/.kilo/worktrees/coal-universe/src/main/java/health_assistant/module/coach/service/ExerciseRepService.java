package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.WorkoutFeedback;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Small Java-first baseline: one exercise, one visible joint angle.
 * The browser sends only landmarks; this service does deterministic validation
 * so the same contract can later be replaced by the Python ML model.
 */
@Service
public class ExerciseRepService {
    private static final double DOWN_ENTER_ANGLE = 95;
    private static final double UP_RETURN_ANGLE = 155;
    private static final double LOW_VISIBILITY = 0.5;

    public WorkoutFeedback track(String exercise, double jointAngle, double visibility) {
        String normalized = exercise.toLowerCase(Locale.ROOT).replace("_", "-");
        if ("squat".equals(normalized) || "squats".equals(normalized)) {
            return trackSquat(jointAngle, visibility);
        }
        throw new IllegalArgumentException("Exercise is not supported yet: " + exercise);
    }

    private WorkoutFeedback trackSquat(double angle, double visibility) {
        if (visibility < LOW_VISIBILITY) {
            return new WorkoutFeedback("squat", 0, "UNAVAILABLE", angle,
                    List.of("Move closer to the camera until the landmarks are visible."), false);
        }
        String phase;
        List<String> corrections = new ArrayList<>();
        if (angle < DOWN_ENTER_ANGLE) {
            phase = "DOWN";
            corrections.add("Keep your chest tall and push your knees away from your toes.");
        } else if (angle < UP_RETURN_ANGLE) {
            phase = "TRANSITION";
        } else {
            phase = "UP";
        }
        return new WorkoutFeedback("squat", 0, phase, angle, corrections, true);
    }
}
