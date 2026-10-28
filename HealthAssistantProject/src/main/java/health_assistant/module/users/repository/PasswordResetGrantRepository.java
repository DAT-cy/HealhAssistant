package health_assistant.module.users.repository;

import health_assistant.module.users.entity.PasswordResetGrant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetGrantRepository extends JpaRepository<PasswordResetGrant, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select g from PasswordResetGrant g where g.email = :email and g.tokenHash = :hash")
    Optional<PasswordResetGrant> findForUpdate(@Param("email") String email, @Param("hash") String tokenHash);

    @Modifying
    @Query("delete from PasswordResetGrant g where g.expiresAt < :now or g.usedAt is not null and g.usedAt < :cutoff")
    int deleteExpiredOrOldUsed(@Param("now") Instant now, @Param("cutoff") Instant cutoff);

    @Modifying
    @Query("update PasswordResetGrant g set g.usedAt = :now where g.email = :email and g.usedAt is null")
    int consumeAllForEmail(@Param("email") String email, @Param("now") Instant now);
}
