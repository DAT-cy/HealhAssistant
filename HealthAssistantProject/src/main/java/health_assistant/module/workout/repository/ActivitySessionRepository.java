package health_assistant.module.workout.repository;

import health_assistant.module.workout.entity.ActivitySession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ActivitySessionRepository extends JpaRepository<ActivitySession, Long> {
    Optional<ActivitySession> findByIdAndUserId(Long id, Long userId);
    Optional<ActivitySession> findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc(Long planSlotId, List<String> statuses);
    List<ActivitySession> findTop10ByPlanSlotIdAndUserIdOrderByStartedAtDesc(Long planSlotId, Long userId);
    List<ActivitySession> findAllByRoadmapIdAndUserIdOrderByStartedAtDesc(Long roadmapId, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ActivitySession s where s.id = :id and s.userId = :userId")
    Optional<ActivitySession> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);
}
