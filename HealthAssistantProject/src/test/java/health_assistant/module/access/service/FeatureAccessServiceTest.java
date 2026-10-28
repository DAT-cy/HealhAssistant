package health_assistant.module.access.service;

import health_assistant.module.access.repository.FeatureEntitlementRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FeatureAccessServiceTest {
    private final FeatureEntitlementRepository repository = mock(FeatureEntitlementRepository.class);
    private final FeatureAccessService service = new FeatureAccessService(repository);

    @Test
    void deniesCameraAiWhenNoActiveEntitlementExists() {
        when(repository.hasActiveEntitlement(eq(42L), eq("AI_GYM_CAMERA"), any(Instant.class))).thenReturn(false);

        assertThatThrownBy(() -> service.requireFeature(42L, "AI_GYM_CAMERA"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Premium");
    }
}
