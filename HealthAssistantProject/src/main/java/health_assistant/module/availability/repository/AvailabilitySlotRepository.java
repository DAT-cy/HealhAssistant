package health_assistant.module.availability.repository;

import health_assistant.module.availability.entity.AvailabilitySlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, Long> {
    List<AvailabilitySlot> findAllByUserIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(Long userId);
    List<AvailabilitySlot> findAllByUserIdAndDayOfWeekAndActiveTrue(Long userId, int dayOfWeek);
    List<AvailabilitySlot> findAllByUserIdAndDayOfWeekAndActiveTrueOrderByStartTimeAsc(Long userId, int dayOfWeek);
    Optional<AvailabilitySlot> findByIdAndUserId(Long id, Long userId);
}
