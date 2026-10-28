package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.DailyAiReview;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyAiReviewRepository extends JpaRepository<DailyAiReview, Long> {
    Optional<DailyAiReview> findByUserIdAndReviewDateAndRoadmapId(Long userId, LocalDate reviewDate, Long roadmapId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DailyAiReview r where r.userId = :userId and r.reviewDate = :reviewDate and r.roadmapId = :roadmapId")
    Optional<DailyAiReview> findForDateAndRoadmapForUpdate(@Param("userId") Long userId,
                                                           @Param("reviewDate") LocalDate reviewDate,
                                                           @Param("roadmapId") Long roadmapId);
    List<DailyAiReview> findTop30ByUserIdOrderByReviewDateDescCreatedAtDesc(Long userId);
    List<DailyAiReview> findTop30ByUserIdAndRoadmapIdOrderByReviewDateDescCreatedAtDesc(Long userId, Long roadmapId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DailyAiReview r where r.id = :id and r.userId = :userId")
    Optional<DailyAiReview> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);
}
