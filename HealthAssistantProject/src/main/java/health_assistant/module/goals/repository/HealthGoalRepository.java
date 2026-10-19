package health_assistant.module.goals.repository;

import health_assistant.module.goals.entity.HealthGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HealthGoalRepository extends JpaRepository<HealthGoal, Long> {
    List<HealthGoal> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    List<HealthGoal> findAllByUserIdAndStatus(Long userId, String status);
    Optional<HealthGoal> findByIdAndUserId(Long id, Long userId);
}
