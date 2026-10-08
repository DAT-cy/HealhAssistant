package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.WorkoutFeedback;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExerciseRepServiceTest {

    private final ExerciseRepService service = new ExerciseRepService();

    @Test
    void countsOneRepAfterFullDownAndUpCycle() {
        String session = "session-1";
        WorkoutFeedback down = service.track("squat", 80, 0.9, session);
        assertThat(down.phase()).isEqualTo("DOWN");
        assertThat(down.repetitionCount()).isZero();

        WorkoutFeedback up = service.track("squat", 165, 0.9, session);
        assertThat(up.phase()).isEqualTo("UP");
        assertThat(up.repetitionCount()).isEqualTo(1);
    }

    @Test
    void returnsUnavailableWhenVisibilityIsBelowThreshold() {
        WorkoutFeedback feedback = service.track("squat", 120, 0.3, "session-2");
        assertThat(feedback.phase()).isEqualTo("UNAVAILABLE");
        assertThat(feedback.confident()).isFalse();
        assertThat(feedback.corrections()).isNotEmpty();
    }

    @Test
    void rejectsUnsupportedExercise() {
        assertThatThrownBy(() -> service.track("bench-press", 90, 0.9, "session-3"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
