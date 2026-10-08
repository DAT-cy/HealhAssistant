package health_assistant.module.workout.repository;

import health_assistant.module.workout.entity.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {
    long countByUserId(Long userId);
}
