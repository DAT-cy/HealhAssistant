package health_assistant.module.goals.service;

import health_assistant.module.goals.dto.HealthGoalRequest;
import health_assistant.module.goals.repository.HealthGoalRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class HealthGoalServiceTest {
    private final HealthGoalRepository repository = mock(HealthGoalRepository.class);
    private final HealthGoalService service = new HealthGoalService(repository);

    @Test
    void rejectsTargetDateBeforeStartDate() {
        HealthGoalRequest request = new HealthGoalRequest("WEIGHT_LOSS", null, null,
                LocalDate.of(2026, 10, 20), LocalDate.of(2026, 10, 19), null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ngày mục tiêu");
        verifyNoInteractions(repository);
    }
}
