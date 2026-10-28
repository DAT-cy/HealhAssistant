package health_assistant.module.users.repository;

import health_assistant.module.users.entity.OtpChallenge;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, Long> {
    java.util.List<OtpChallenge> findAllByEmailAndPurposeAndStatusOrderByCreatedAtDesc(String email, String purpose, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from OtpChallenge c where c.email = :email and c.purpose = :purpose and c.status = 'PENDING' order by c.createdAt desc")
    java.util.List<OtpChallenge> findPendingForUpdate(@Param("email") String email, @Param("purpose") String purpose);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from OtpChallenge c where c.id = :id")
    Optional<OtpChallenge> findByIdForUpdate(@Param("id") Long id);

    @Modifying
    @Query("delete from OtpChallenge c where c.expiresAt < :now or c.status in ('USED','SUPERSEDED','LOCKED') and c.createdAt < :cutoff")
    int deleteExpiredOrOldClosed(@Param("now") Instant now, @Param("cutoff") Instant cutoff);

    @Modifying
    @Query("update OtpChallenge c set c.status = 'USED', c.consumedAt = :now where c.email = :email and c.purpose = 'RESET_PASSWORD' and c.status = 'PENDING'")
    int consumePendingPasswordReset(@Param("email") String email, @Param("now") Instant now);
}
