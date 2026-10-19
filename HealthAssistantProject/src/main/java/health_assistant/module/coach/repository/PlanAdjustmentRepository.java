package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.PlanAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface PlanAdjustmentRepository extends JpaRepository<PlanAdjustment, Long> {
    List<PlanAdjustment> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<PlanAdjustment> findFirstByUserIdAndRoadmapIdAndStatusOrderByCreatedAtDesc(
            Long userId, Long roadmapId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from PlanAdjustment a where a.id = :id and a.userId = :userId")
    Optional<PlanAdjustment> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);
}
