package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.RoadmapRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoadmapRecordRepository extends JpaRepository<RoadmapRecord, Long> {
    List<RoadmapRecord> findTop10ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}
