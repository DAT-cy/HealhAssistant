package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.PlanReschedulePreview;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface PlanReschedulePreviewRepository extends JpaRepository<PlanReschedulePreview, Long> {
    List<PlanReschedulePreview> findTop30ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(Long userId, Instant from, Instant to);
    Optional<PlanReschedulePreview> findByPreviewIdAndUserId(String previewId, Long userId);
    long countByUserIdAndStatusAndDecidedAtGreaterThanEqualAndDecidedAtLessThan(Long userId, String status, Instant from, Instant to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PlanReschedulePreview p where p.previewId = :previewId and p.userId = :userId")
    Optional<PlanReschedulePreview> findForUpdate(@Param("previewId") String previewId, @Param("userId") Long userId);
}
