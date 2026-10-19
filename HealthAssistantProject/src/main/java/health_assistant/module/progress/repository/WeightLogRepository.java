package health_assistant.module.progress.repository;

import health_assistant.module.progress.entity.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {
    List<WeightLog> findAllByUserIdOrderByMeasuredOnAsc(Long userId);
    List<WeightLog> findAllByUserIdAndMeasuredOnBetweenOrderByMeasuredOnAsc(Long userId, LocalDate from, LocalDate to);
    Optional<WeightLog> findByUserIdAndMeasuredOn(Long userId, LocalDate measuredOn);
    Optional<WeightLog> findByIdAndUserId(Long id, Long userId);
}
