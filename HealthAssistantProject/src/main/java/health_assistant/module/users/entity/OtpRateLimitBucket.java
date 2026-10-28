package health_assistant.module.users.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "otp_rate_limit_buckets")
@Getter
@Setter
public class OtpRateLimitBucket {
    @Id @Column(name = "bucket_hash", length = 64)
    private String bucketHash;
    @Column(name = "window_started_at", nullable = false)
    private Instant windowStartedAt;
    @Column(name = "last_requested_at")
    private Instant lastRequestedAt;
    @Column(name = "request_count", nullable = false)
    private int requestCount;
    @Version
    private Long rowVersion;
}
