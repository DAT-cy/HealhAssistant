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

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AvailabilitySlotService {
    private final AvailabilitySlotRepository repository;

    @Transactional
    public AvailabilitySlotResponse create(AvailabilitySlotRequest request) {
        validateTimeRanges(List.of(request));
        Long userId = SecurityUtils.getCurrentUserId();
        validateRequests(userId, List.of(request));
        return toResponse(repository.save(toEntity(userId, request)));
    }

    @Transactional
    public List<AvailabilitySlotResponse> createBatch(List<AvailabilitySlotRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("Cần có ít nhất một khung giờ rảnh.");
        }
        validateTimeRanges(requests);
        Long userId = SecurityUtils.getCurrentUserId();
        validateRequests(userId, requests);
        return repository.saveAll(requests.stream().map(request -> toEntity(userId, request)).toList())
                .stream().map(this::toResponse).toList();
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

    private void validateRequests(Long userId, List<AvailabilitySlotRequest> requests) {
        Map<Integer, List<AvailabilitySlotRequest>> byDay = new HashMap<>();
        for (AvailabilitySlotRequest request : requests) {
            byDay.computeIfAbsent(request.dayOfWeek(), ignored -> new ArrayList<>()).add(request);
        }
        for (Map.Entry<Integer, List<AvailabilitySlotRequest>> entry : byDay.entrySet()) {
            List<AvailabilitySlot> existingSlots = repository.findAllByUserIdAndDayOfWeekAndActiveTrue(userId, entry.getKey());
            for (AvailabilitySlotRequest request : entry.getValue()) {
                boolean overlapsExisting = existingSlots.stream().anyMatch(slot -> overlaps(
                        request.startTime(), request.endTime(), slot.getStartTime(), slot.getEndTime()));
                boolean overlapsRequest = entry.getValue().stream().anyMatch(other -> other != request && overlaps(
                        request.startTime(), request.endTime(), other.startTime(), other.endTime()));
                if (overlapsExisting || overlapsRequest) {
                    throw new IllegalArgumentException("Khung giờ bị trùng với lịch rảnh đã khai báo.");
                }
            }
        }
    }

    private void validateTimeRanges(List<AvailabilitySlotRequest> requests) {
        if (requests.stream().anyMatch(request -> !request.endTime().isAfter(request.startTime()))) {
            throw new IllegalArgumentException("Giờ kết thúc phải sau giờ bắt đầu.");
        }
    }

    private boolean overlaps(LocalTime start, LocalTime end, LocalTime otherStart, LocalTime otherEnd) {
        return start.isBefore(otherEnd) && end.isAfter(otherStart);
    }

    private AvailabilitySlot toEntity(Long userId, AvailabilitySlotRequest request) {
        AvailabilitySlot slot = new AvailabilitySlot();
        slot.setUserId(userId);
        slot.setDayOfWeek(request.dayOfWeek());
        slot.setStartTime(request.startTime());
        slot.setEndTime(request.endTime());
        slot.setActivityType(request.activityType());
        slot.setLocationType(request.locationType());
        slot.setEquipmentNotes(request.equipmentNotes());
        return slot;
    }
}
