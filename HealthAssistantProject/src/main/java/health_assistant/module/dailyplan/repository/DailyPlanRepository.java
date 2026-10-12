package health_assistant.module.dailyplan.repository;

import health_assistant.module.dailyplan.entity.DailyPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyPlanRepository extends JpaRepository<DailyPlan, Long> {
    Optional<DailyPlan> findByUserIdAndPlanDate(Long userId, LocalDate planDate);
}
