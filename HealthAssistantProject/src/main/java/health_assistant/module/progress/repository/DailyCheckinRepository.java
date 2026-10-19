package health_assistant.module.progress.repository;

import health_assistant.module.progress.entity.DailyCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyCheckinRepository extends JpaRepository<DailyCheckin, Long> {
    Optional<DailyCheckin> findByUserIdAndCheckInDate(Long userId, LocalDate checkInDate);
    List<DailyCheckin> findAllByUserIdOrderByCheckInDateAsc(Long userId);
    List<DailyCheckin> findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(
            Long userId, LocalDate from, LocalDate to);
}
