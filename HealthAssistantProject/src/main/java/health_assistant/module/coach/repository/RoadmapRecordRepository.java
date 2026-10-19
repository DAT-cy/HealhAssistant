package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.RoadmapRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoadmapRecordRepository extends JpaRepository<RoadmapRecord, Long> {
    List<RoadmapRecord> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RoadmapRecord> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
    Optional<RoadmapRecord> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<RoadmapRecord> findByIdAndUserId(Long id, Long userId);
    long countByUserId(Long userId);
}
