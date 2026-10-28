package health_assistant.module.workout.repository;

import health_assistant.module.workout.entity.WorkoutSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {
    long countByUserId(Long userId);
    Optional<WorkoutSession> findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc(Long planSlotId, List<String> statuses);
    List<WorkoutSession> findAllByPlanSlotIdAndUserId(Long planSlotId, Long userId);
    List<WorkoutSession> findTop10ByPlanSlotIdAndUserIdOrderByStartedAtDesc(Long planSlotId, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from WorkoutSession s where s.id = :id and s.userId = :userId")
    Optional<WorkoutSession> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    Optional<WorkoutSession> findByIdAndUserId(Long id, Long userId);
}
