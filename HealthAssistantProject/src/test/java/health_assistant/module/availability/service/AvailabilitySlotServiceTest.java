package health_assistant.module.availability.service;

import health_assistant.module.availability.dto.AvailabilitySlotRequest;
import health_assistant.module.availability.repository.AvailabilitySlotRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class AvailabilitySlotServiceTest {
    private final AvailabilitySlotRepository repository = mock(AvailabilitySlotRepository.class);
    private final AvailabilitySlotService service = new AvailabilitySlotService(repository);

    @Test
    void rejectsInvalidTimeRangeBeforeReadingUserSchedule() {
        AvailabilitySlotRequest request = new AvailabilitySlotRequest(1,
                LocalTime.of(19, 0), LocalTime.of(18, 0), "WORKOUT", "HOME", null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Giờ kết thúc");
        verifyNoInteractions(repository);
    }
}
