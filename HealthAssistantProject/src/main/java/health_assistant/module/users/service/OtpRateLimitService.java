package health_assistant.module.users.service;

import health_assistant.module.users.entity.OtpRateLimitBucket;
import health_assistant.module.users.repository.OtpRateLimitBucketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class OtpRateLimitService {
    private final OtpRateLimitBucketRepository repository;

    @Value("${app.otp.rate-limit-secret:}")
    private String pepper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void claim(String bucketType, String value, int maxRequests, Duration window, Duration cooldown) {
        String key = hash(bucketType + ":" + value);
        Instant now = Instant.now();
        repository.createIfMissing(key, now);
        OtpRateLimitBucket bucket = repository.findForUpdate(key)
                .orElseThrow(() -> new IllegalStateException("OTP rate-limit record is unavailable."));
        if (!bucket.getWindowStartedAt().plus(window).isAfter(now)) {
            bucket.setWindowStartedAt(now);
            bucket.setRequestCount(0);
            bucket.setLastRequestedAt(null);
        }
        Instant last = bucket.getLastRequestedAt();
        if (last != null && last.plus(cooldown).isAfter(now)) {
            long retrySeconds = Math.max(1, Duration.between(now, last.plus(cooldown)).toSeconds());
            throw new OtpRateLimitException("Vui lòng chờ " + retrySeconds + " giây trước khi yêu cầu mã mới.");
        }
        if (bucket.getRequestCount() >= maxRequests) {
            throw new OtpRateLimitException("Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.");
        }
        bucket.setRequestCount(bucket.getRequestCount() + 1);
        bucket.setLastRequestedAt(now);
        repository.save(bucket);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cleanup(Instant cutoff) { repository.deleteOld(cutoff); }

    private String hash(String input) {
        try {
            if (pepper == null || pepper.isBlank()) throw new IllegalStateException("OTP_RATE_LIMIT_SECRET must be configured.");
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            if (exception instanceof IllegalStateException state) throw state;
            throw new IllegalStateException("Cannot protect OTP rate-limit key.");
        }
    }
}
