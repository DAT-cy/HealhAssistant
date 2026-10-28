package health_assistant.module.users.repository;

import health_assistant.module.users.entity.OtpRateLimitBucket;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface OtpRateLimitBucketRepository extends JpaRepository<OtpRateLimitBucket, String> {
    @Modifying
    @Query(value = "INSERT IGNORE INTO otp_rate_limit_buckets (bucket_hash,window_started_at,request_count) VALUES (:key,:now,0)", nativeQuery = true)
    int createIfMissing(@Param("key") String key, @Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from OtpRateLimitBucket b where b.bucketHash = :key")
    Optional<OtpRateLimitBucket> findForUpdate(@Param("key") String key);

    @Modifying
    @Query("delete from OtpRateLimitBucket b where b.windowStartedAt < :cutoff")
    int deleteOld(@Param("cutoff") Instant cutoff);
}
