package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.WorkoutFeedback;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

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
    private final ConcurrentHashMap<String, SessionState> sessions = new ConcurrentHashMap<>();

    public WorkoutFeedback track(String exercise, double jointAngle, double visibility, String sessionId) {
        String normalized = exercise.toLowerCase(Locale.ROOT).replace("_", "-");
        if (!"squat".equals(normalized) && !"squats".equals(normalized)) {
            throw new IllegalArgumentException("Bài tập này chưa được hỗ trợ: " + exercise);
        }
        return trackSquat(jointAngle, visibility, sessionId);
    }

    private WorkoutFeedback trackSquat(double angle, double visibility, String sessionId) {
        if (visibility < LOW_VISIBILITY) {
            return new WorkoutFeedback("squat", currentCount(sessionId), "UNAVAILABLE", angle,
                    List.of("Hãy lùi lại hoặc chỉnh camera để nhìn rõ toàn bộ cơ thể."), false);
        }
        SessionState state = sessionId == null || sessionId.isBlank()
                ? new SessionState()
                : sessions.computeIfAbsent(sessionId, ignored -> new SessionState());
        String phase;
        if (angle < DOWN_ENTER_ANGLE) {
            phase = "DOWN";
            state.wasDown = true;
        } else if (angle < UP_RETURN_ANGLE) {
            phase = "TRANSITION";
        } else {
            phase = "UP";
            if (state.wasDown) {
                state.repetitionCount++;
                state.wasDown = false;
            }
        }
        List<String> corrections = "DOWN".equals(phase)
                ? List.of("Giữ lưng thẳng và đẩy gối ra ngoài.")
                : List.of();
        return new WorkoutFeedback("squat", state.repetitionCount, phase, angle, corrections, true);
    }

    private int currentCount(String sessionId) {
        SessionState state = sessionId == null ? null : sessions.get(sessionId);
        return state == null ? 0 : state.repetitionCount;
    }

    private static final class SessionState {
        private boolean wasDown;
        private int repetitionCount;
    }

    public int end(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return 0;
        SessionState state = sessions.remove(sessionId);
        return state == null ? 0 : state.repetitionCount;
    }
}
