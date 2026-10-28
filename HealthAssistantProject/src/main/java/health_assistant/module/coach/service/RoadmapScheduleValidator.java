package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.RoadmapSlotRequest;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class RoadmapScheduleValidator {
    private static final int MAX_WEEKLY_SLOTS = 84;

    public void validate(List<RoadmapSlotRequest> slots, int weeks, boolean requireAtLeastOne) {
        if (weeks < 1 || weeks > 12) throw new IllegalArgumentException("Thời lượng lộ trình phải từ 1 đến 12 tuần.");
        if (slots == null || (requireAtLeastOne && slots.isEmpty())) {
            throw new IllegalArgumentException("Hãy chọn ít nhất một khung giờ tập trong tuần.");
        }
        if (slots.size() > MAX_WEEKLY_SLOTS) throw new IllegalArgumentException("Mỗi tuần chỉ được có tối đa 84 khung giờ.");

        Map<Integer, List<RoadmapSlotRequest>> byDay = new HashMap<>();
        for (RoadmapSlotRequest slot : slots) {
            if (slot == null || slot.dayOfWeek() == null || slot.dayOfWeek() < 1 || slot.dayOfWeek() > 7 ||
                    !List.of("MORNING", "AFTERNOON", "EVENING").contains(slot.sessionPeriod()) ||
                    slot.startTime() == null || slot.endTime() == null || !slot.endTime().isAfter(slot.startTime())) {
                throw new IllegalArgumentException("Ngày, buổi hoặc giờ tập không hợp lệ.");
            }
            long duration = java.time.Duration.between(slot.startTime(), slot.endTime()).toMinutes();
            if (duration < 15 || duration > 240) throw new IllegalArgumentException("Mỗi khung tập phải dài từ 15 đến 240 phút.");
            validatePeriod(slot);
            byDay.computeIfAbsent(slot.dayOfWeek(), ignored -> new java.util.ArrayList<>()).add(slot);
        }
        byDay.values().forEach(daySlots -> {
            daySlots.sort(java.util.Comparator.comparing(RoadmapSlotRequest::startTime));
            for (int index = 1; index < daySlots.size(); index++) {
                if (daySlots.get(index).startTime().isBefore(daySlots.get(index - 1).endTime())) {
                    throw new IllegalArgumentException("Các khung giờ trong cùng ngày không được trùng nhau.");
                }
            }
        });
    }

    private void validatePeriod(RoadmapSlotRequest slot) {
        LocalTime noon = LocalTime.NOON;
        LocalTime evening = LocalTime.of(18, 0);
        boolean valid = switch (slot.sessionPeriod()) {
            case "MORNING" -> slot.startTime().isBefore(noon) && !slot.endTime().isAfter(noon);
            case "AFTERNOON" -> !slot.startTime().isBefore(noon) && !slot.startTime().isAfter(evening)
                    && slot.endTime().isAfter(noon) && !slot.endTime().isAfter(evening);
            case "EVENING" -> !slot.startTime().isBefore(evening) && slot.endTime().isAfter(evening);
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException("Giờ tập không nằm trong buổi đã chọn.");
    }
}
