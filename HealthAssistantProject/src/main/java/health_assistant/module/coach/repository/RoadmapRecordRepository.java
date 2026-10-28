package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.RoadmapRecord;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoadmapRecordRepository extends JpaRepository<RoadmapRecord, Long> {
    List<RoadmapRecord> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RoadmapRecord> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
    Optional<RoadmapRecord> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RoadmapRecord> findByIdAndUserId(Long id, Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RoadmapRecord r where r.id = :id and r.userId = :userId")
    Optional<RoadmapRecord> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);
    long countByUserId(Long userId);
}
