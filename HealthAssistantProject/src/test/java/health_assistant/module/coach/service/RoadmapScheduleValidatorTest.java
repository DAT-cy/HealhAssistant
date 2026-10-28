package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.RoadmapSlotRequest;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoadmapScheduleValidatorTest {
    private final RoadmapScheduleValidator validator = new RoadmapScheduleValidator();

    @Test
    void acceptsMultipleSessionsAndSlotsWithRestDays() {
        List<RoadmapSlotRequest> schedule = List.of(
                slot(1, "MORNING", "06:00", "07:00"),
                slot(1, "MORNING", "09:00", "10:00"),
                slot(2, "AFTERNOON", "14:00", "15:00"),
                slot(2, "EVENING", "19:00", "19:30"));

        assertThatCode(() -> validator.validate(schedule, 4, true)).doesNotThrowAnyException();
    }

    @Test
    void rejectsOverlappingSlotsWithinTheSameDay() {
        List<RoadmapSlotRequest> schedule = List.of(
                slot(1, "MORNING", "06:00", "07:00"),
                slot(1, "MORNING", "06:30", "07:30"));

        assertThatThrownBy(() -> validator.validate(schedule, 2, true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSlotOutsideSelectedSession() {
        assertThatThrownBy(() -> validator.validate(List.of(slot(1, "MORNING", "15:00", "16:00")), 1, true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("buổi đã chọn");
    }

    @Test
    void rejectsInvalidDurationAndEmptySchedule() {
        assertThatThrownBy(() -> validator.validate(List.of(slot(1, "EVENING", "19:00", "19:10")), 1, true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("15 đến 240 phút");
        assertThatThrownBy(() -> validator.validate(List.of(), 1, true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private RoadmapSlotRequest slot(int day, String period, String start, String end) {
        return new RoadmapSlotRequest(day, period, LocalTime.parse(start), LocalTime.parse(end), "GYM", "Workout");
    }
}
