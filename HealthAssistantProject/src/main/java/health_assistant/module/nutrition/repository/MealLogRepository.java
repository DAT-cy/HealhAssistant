package health_assistant.module.nutrition.repository;

import health_assistant.module.nutrition.entity.MealLog;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MealLogRepository extends JpaRepository<MealLog, Long> {
    List<MealLog> findAllByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAtAsc(
            Long userId, LocalDateTime from, LocalDateTime to);

    @Query("select m from MealLog m where m.userId = :userId and (m.mealDate = :mealDate or (m.mealDate is null and m.loggedAt >= :from and m.loggedAt < :to)) order by m.loggedAt asc")
    List<MealLog> findAllForUserAndDate(@Param("userId") Long userId, @Param("mealDate") java.time.LocalDate mealDate,
                                        @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    Optional<MealLog> findByIdAndUserId(Long id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MealLog m where m.id = :id and m.userId = :userId")
    Optional<MealLog> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

}
