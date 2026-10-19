package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.RoadmapPreview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface RoadmapPreviewRepository extends JpaRepository<RoadmapPreview, String> {
    Optional<RoadmapPreview> findByIdAndUserId(String id, Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from RoadmapPreview p where p.id = :id and p.userId = :userId")
    Optional<RoadmapPreview> findByIdAndUserIdForUpdate(@Param("id") String id, @Param("userId") Long userId);
}
