package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.RoadmapPlanSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface RoadmapPlanSlotRepository extends JpaRepository<RoadmapPlanSlot, Long> {
    List<RoadmapPlanSlot> findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(Long roadmapId);
    Optional<RoadmapPlanSlot> findByIdAndRoadmap_Id(Long id, Long roadmapId);

    @Query("select s from RoadmapPlanSlot s join fetch s.roadmap r where s.id = :slotId and r.userId = :userId")
    Optional<RoadmapPlanSlot> findByIdAndUserId(@Param("slotId") Long slotId, @Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RoadmapPlanSlot s where s.id = :slotId and s.roadmap.id = :roadmapId")
    Optional<RoadmapPlanSlot> findByIdAndRoadmapIdForUpdate(@Param("slotId") Long slotId,
                                                             @Param("roadmapId") Long roadmapId);

    List<RoadmapPlanSlot> findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(Long roadmapId, int dayIndex);
    List<RoadmapPlanSlot> findAllByRoadmap_IdAndStatusIn(Long roadmapId, List<String> statuses);
}
