package health_assistant.module.users.service;

import health_assistant.module.users.entity.OtpRateLimitBucket;
import health_assistant.module.users.repository.OtpRateLimitBucketRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OtpRateLimitServiceTest {
    @Test
    void recordsRequestInPepperedBucket() {
        OtpRateLimitBucketRepository repository = mock(OtpRateLimitBucketRepository.class);
        OtpRateLimitService service = new OtpRateLimitService(repository);
        ReflectionTestUtils.setField(service, "pepper", "unit-test-pepper");
        OtpRateLimitBucket bucket = new OtpRateLimitBucket(); bucket.setBucketHash("bucket");
        bucket.setWindowStartedAt(Instant.now()); bucket.setRequestCount(0);
        when(repository.findForUpdate(anyString())).thenReturn(Optional.of(bucket));

        service.claim("otp-email", "person@example.test", 5, Duration.ofHours(1), Duration.ofSeconds(60));

        assertEquals(1, bucket.getRequestCount());
        assertNotNull(bucket.getLastRequestedAt());
        verify(repository).createIfMissing(anyString(), any());
        verify(repository).save(bucket);
    }

    @Test
    void cooldownAndHourlyLimitRejectFurtherRequests() {
        OtpRateLimitBucketRepository repository = mock(OtpRateLimitBucketRepository.class);
        OtpRateLimitService service = new OtpRateLimitService(repository);
        ReflectionTestUtils.setField(service, "pepper", "unit-test-pepper");
        OtpRateLimitBucket cooldown = new OtpRateLimitBucket(); cooldown.setWindowStartedAt(Instant.now());
        cooldown.setLastRequestedAt(Instant.now().minusSeconds(10)); cooldown.setRequestCount(1);
        when(repository.findForUpdate(anyString())).thenReturn(Optional.of(cooldown));
        assertThrows(OtpRateLimitException.class, () -> service.claim("otp-email", "person@example.test", 5,
                Duration.ofHours(1), Duration.ofSeconds(60)));
        verify(repository, never()).save(any());

        OtpRateLimitBucket limited = new OtpRateLimitBucket(); limited.setWindowStartedAt(Instant.now());
        limited.setLastRequestedAt(Instant.now().minusSeconds(120)); limited.setRequestCount(5);
        when(repository.findForUpdate(anyString())).thenReturn(Optional.of(limited));
        assertThrows(OtpRateLimitException.class, () -> service.claim("otp-email", "other@example.test", 5,
                Duration.ofHours(1), Duration.ofSeconds(60)));
        verify(repository, never()).save(limited);
    }
}
