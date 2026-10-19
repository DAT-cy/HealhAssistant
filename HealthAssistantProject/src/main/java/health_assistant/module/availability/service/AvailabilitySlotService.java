package health_assistant.module.availability.service;

import health_assistant.module.availability.dto.AvailabilitySlotRequest;
import health_assistant.module.availability.dto.AvailabilitySlotResponse;
import health_assistant.module.availability.entity.AvailabilitySlot;
import health_assistant.module.availability.repository.AvailabilitySlotRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AvailabilitySlotService {
    private final AvailabilitySlotRepository repository;

    @Transactional
    public AvailabilitySlotResponse create(AvailabilitySlotRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("Giờ kết thúc phải sau giờ bắt đầu.");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        boolean overlaps = repository.findAllByUserIdAndDayOfWeekAndActiveTrue(userId, request.dayOfWeek())
                .stream()
                .anyMatch(slot -> request.startTime().isBefore(slot.getEndTime())
                        && request.endTime().isAfter(slot.getStartTime()));
        if (overlaps) {
            throw new IllegalArgumentException("Khung giờ bị trùng với lịch rảnh đã khai báo.");
        }

        AvailabilitySlot slot = new AvailabilitySlot();
        slot.setUserId(userId);
        slot.setDayOfWeek(request.dayOfWeek());
        slot.setStartTime(request.startTime());
        slot.setEndTime(request.endTime());
        slot.setActivityType(request.activityType());
        slot.setLocationType(request.locationType());
        slot.setEquipmentNotes(request.equipmentNotes());
        return toResponse(repository.save(slot));
    }

    @Transactional(readOnly = true)
    public List<AvailabilitySlotResponse> listMine() {
        return repository.findAllByUserIdAndActiveTrueOrderByDayOfWeekAscStartTimeAsc(
                        SecurityUtils.getCurrentUserId()).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public void deactivate(Long id) {
        AvailabilitySlot slot = repository.findByIdAndUserId(id, SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung giờ rảnh."));
        slot.setActive(false);
    }

    private AvailabilitySlotResponse toResponse(AvailabilitySlot slot) {
        return new AvailabilitySlotResponse(slot.getId(), slot.getDayOfWeek(), slot.getStartTime(),
                slot.getEndTime(), slot.getActivityType(), slot.getLocationType(), slot.getEquipmentNotes(),
                slot.isActive(), slot.getCreatedAt());
    }
}
