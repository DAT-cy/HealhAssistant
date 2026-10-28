package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.CompleteRoadmapSlotRequest;
import health_assistant.module.coach.dto.RoadmapDayResponse;
import health_assistant.module.coach.dto.RoadmapPlanSlotResponse;
import health_assistant.module.coach.dto.RoadmapPlanSlotStatusRequest;
import health_assistant.module.coach.dto.RoadmapProgressResponse;
import health_assistant.module.coach.dto.SkipRoadmapSlotRequest;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoadmapPlanSlotService {
    private static final List<String> TERMINAL_STATES = List.of("COMPLETED", "SKIPPED", "CANCELLED");

    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<RoadmapPlanSlotResponse> listMine(Long roadmapId) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        return slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(roadmapId).stream()
                .map(slot -> toResponse(slot, roadmap.getStartDate())).toList();
    }

    @Transactional(readOnly = true)
    public List<RoadmapPlanSlotResponse> listRange(Long roadmapId, LocalDate from, LocalDate to) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        LocalDate start = from == null ? roadmap.getStartDate() : from;
        LocalDate end = to == null && start != null ? start.plusDays(6) : to;
        validateRange(roadmap, start, end);
        int fromIndex = Math.toIntExact(Duration.between(roadmap.getStartDate().atStartOfDay(), start.atStartOfDay()).toDays());
        int toIndex = Math.toIntExact(Duration.between(roadmap.getStartDate().atStartOfDay(), end.atStartOfDay()).toDays());
        return slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(roadmapId).stream()
                .filter(slot -> slot.getDayIndex() >= fromIndex && slot.getDayIndex() <= toIndex)
                .map(slot -> toResponse(slot, roadmap.getStartDate())).toList();
    }

    @Transactional(readOnly = true)
    public RoadmapDayResponse day(Long roadmapId, LocalDate date) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        if (roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null) {
            throw new IllegalStateException("Lộ trình chưa có ngày bắt đầu hoặc thời lượng hợp lệ.");
        }
        int dayIndex = Math.toIntExact(Duration.between(roadmap.getStartDate().atStartOfDay(), date.atStartOfDay()).toDays());
        if (dayIndex < 0 || dayIndex >= roadmap.getDurationWeeks() * 7) {
            throw new IllegalArgumentException("Ngày đã chọn nằm ngoài thời lượng lộ trình.");
        }

        List<RoadmapPlanSlot> slots = slotRepository.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(roadmapId, dayIndex);
        int total = slots.size();
        int completed = count(slots, "COMPLETED");
        int expected = slots.stream().mapToInt(RoadmapPlanSlot::getDurationMinutes).sum();
        int actual = slots.stream().mapToInt(slot -> slot.getActualDurationMinutes() == null ? 0 : slot.getActualDurationMinutes()).sum();
        List<String> weeklyPlan = readJsonList(roadmap.getWeeklyPlan());
        String weeklyFocus = dayIndex / 7 < weeklyPlan.size() ? weeklyPlan.get(dayIndex / 7) : "";

        return new RoadmapDayResponse(roadmapId, roadmap.getTitle(), dayIndex, date, dayStatus(slots), total, completed,
                expected, actual, weeklyFocus, readJsonList(roadmap.getSafetyNotes()),
                slots.stream().map(slot -> toResponse(slot, roadmap.getStartDate())).toList());
    }

    @Transactional(readOnly = true)
    public RoadmapProgressResponse progress(Long roadmapId) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        List<RoadmapPlanSlot> slots = slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(roadmapId);
        int upcoming = count(slots, "UPCOMING", "PLANNED");
        int inProgress = count(slots, "IN_PROGRESS");
        int completed = count(slots, "COMPLETED");
        int skipped = count(slots, "SKIPPED");
        int cancelled = count(slots, "CANCELLED");
        long activeDays = slots.stream().map(RoadmapPlanSlot::getDayIndex).distinct().count();
        Map<Integer, List<RoadmapPlanSlot>> byDay = new HashMap<>();
        slots.forEach(slot -> byDay.computeIfAbsent(slot.getDayIndex(), ignored -> new ArrayList<>()).add(slot));
        long completedDays = byDay.values().stream().filter(day -> day.stream().allMatch(slot -> "COMPLETED".equals(normalizeStatus(slot.getStatus())))).count();
        int percent = slots.isEmpty() ? 0 : Math.round(completed * 100f / slots.size());
        String status = overallStatus(slots);
        return new RoadmapProgressResponse(roadmapId, status, (roadmap.getDurationWeeks() == null ? 0 : roadmap.getDurationWeeks() * 7),
                slots.size(), upcoming, inProgress, completed, skipped, cancelled, Math.toIntExact(completedDays),
                Math.toIntExact(activeDays), percent);
    }

    @Transactional
    public RoadmapPlanSlotResponse start(Long roadmapId, Long slotId) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        requireActive(roadmap);
        RoadmapPlanSlot slot = ownedSlotForUpdate(roadmapId, slotId);
        String status = normalizeStatus(slot.getStatus());
        if ("IN_PROGRESS".equals(status)) return toResponse(slot, roadmap.getStartDate());
        if (!"UPCOMING".equals(status)) throw new IllegalArgumentException("Chỉ có thể bắt đầu một hoạt động đang chờ.");
        slot.setStatus("IN_PROGRESS");
        slot.setStartedAt(Instant.now());
        return toResponse(slotRepository.saveAndFlush(slot), roadmap.getStartDate());
    }

    @Transactional
    public RoadmapPlanSlotResponse complete(Long roadmapId, Long slotId, CompleteRoadmapSlotRequest request) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        requireActive(roadmap);
        RoadmapPlanSlot slot = ownedSlotForUpdate(roadmapId, slotId);
        String status = normalizeStatus(slot.getStatus());
        if ("COMPLETED".equals(status)) return toResponse(slot, roadmap.getStartDate());
        if ("SKIPPED".equals(status) || "CANCELLED".equals(status)) {
            throw new IllegalArgumentException("Hoạt động đã bỏ qua hoặc hủy không thể hoàn thành.");
        }
        Instant completedAt = Instant.now();
        int actualMinutes = request.actualDurationMinutes() != null ? request.actualDurationMinutes()
                : slot.getStartedAt() == null ? slot.getDurationMinutes()
                : elapsedMinutes(slot.getStartedAt(), completedAt);
        slot.setStatus("COMPLETED");
        slot.setCompletedAt(completedAt);
        slot.setActualDurationMinutes(actualMinutes);
        slot.setNotes(blankToNull(request.notes()));
        return toResponse(slotRepository.saveAndFlush(slot), roadmap.getStartDate());
    }

    @Transactional
    public RoadmapPlanSlotResponse skip(Long roadmapId, Long slotId, SkipRoadmapSlotRequest request) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        requireActive(roadmap);
        RoadmapPlanSlot slot = ownedSlotForUpdate(roadmapId, slotId);
        String status = normalizeStatus(slot.getStatus());
        if ("SKIPPED".equals(status)) return toResponse(slot, roadmap.getStartDate());
        if ("COMPLETED".equals(status) || "CANCELLED".equals(status)) {
            throw new IllegalArgumentException("Hoạt động đã hoàn thành hoặc hủy không thể bỏ qua.");
        }
        capturePartialDuration(slot);
        slot.setStatus("SKIPPED");
        slot.setCompletedAt(null);
        slot.setSkipReason(blankToNull(request.reason()));
        return toResponse(slotRepository.saveAndFlush(slot), roadmap.getStartDate());
    }

    @Transactional
    public RoadmapPlanSlotResponse cancel(Long roadmapId, Long slotId) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        requireActive(roadmap);
        RoadmapPlanSlot slot = ownedSlotForUpdate(roadmapId, slotId);
        String status = normalizeStatus(slot.getStatus());
        if ("CANCELLED".equals(status)) return toResponse(slot, roadmap.getStartDate());
        if ("COMPLETED".equals(status) || "SKIPPED".equals(status)) {
            throw new IllegalArgumentException("Hoạt động đã kết thúc không thể hủy.");
        }
        capturePartialDuration(slot);
        slot.setStatus("CANCELLED");
        return toResponse(slotRepository.saveAndFlush(slot), roadmap.getStartDate());
    }

    @Transactional
    public RoadmapPlanSlotResponse updateStatus(Long roadmapId, Long slotId, RoadmapPlanSlotStatusRequest request) {
        return switch (request.status()) {
            case "PLANNED", "UPCOMING" -> {
                RoadmapPlanSlotResponse current = getOwnedSlot(roadmapId, slotId);
                if (!"UPCOMING".equals(current.status())) throw new IllegalArgumentException("Không thể đặt lại trạng thái hoạt động đã bắt đầu.");
                yield current;
            }
            case "IN_PROGRESS" -> start(roadmapId, slotId);
            case "COMPLETED" -> complete(roadmapId, slotId,
                    new CompleteRoadmapSlotRequest(null, request.notes()));
            case "SKIPPED" -> {
                if (request.notes() != null && request.notes().length() > 300) {
                    throw new IllegalArgumentException("Lý do bỏ qua không được vượt quá 300 ký tự.");
                }
                yield skip(roadmapId, slotId, new SkipRoadmapSlotRequest(request.notes()));
            }
            case "CANCELLED" -> cancel(roadmapId, slotId);
            default -> throw new IllegalArgumentException("Trạng thái khung tập không hợp lệ.");
        };
    }

    private RoadmapPlanSlotResponse getOwnedSlot(Long roadmapId, Long slotId) {
        RoadmapRecord roadmap = ownedRoadmap(roadmapId);
        RoadmapPlanSlot slot = slotRepository.findByIdAndRoadmap_Id(slotId, roadmapId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung tập trong lộ trình này."));
        return toResponse(slot, roadmap.getStartDate());
    }

    private RoadmapPlanSlot ownedSlotForUpdate(Long roadmapId, Long slotId) {
        return slotRepository.findByIdAndRoadmapIdForUpdate(slotId, roadmapId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung tập trong lộ trình này."));
    }

    private RoadmapRecord ownedRoadmap(Long roadmapId) {
        return roadmapRepository.findByIdAndUserId(roadmapId, SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
    }

    private void requireActive(RoadmapRecord roadmap) {
        if (!"ACTIVE".equals(roadmap.getStatus())) throw new IllegalArgumentException("Chỉ có thể cập nhật hoạt động của lộ trình đang chạy.");
    }

    private void validateRange(RoadmapRecord roadmap, LocalDate from, LocalDate to) {
        if (roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null || from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("Khoảng ngày của lộ trình không hợp lệ.");
        }
        if (Duration.between(from.atStartOfDay(), to.atStartOfDay()).toDays() > 89) {
            throw new IllegalArgumentException("Mỗi lần chỉ có thể xem tối đa 90 ngày.");
        }
        LocalDate lastDate = roadmap.getStartDate().plusDays(roadmap.getDurationWeeks() * 7L - 1);
        if (from.isBefore(roadmap.getStartDate()) || to.isAfter(lastDate)) {
            throw new IllegalArgumentException("Khoảng ngày nằm ngoài thời lượng lộ trình.");
        }
    }

    private String dayStatus(List<RoadmapPlanSlot> slots) {
        if (slots.isEmpty()) return "REST";
        List<String> statuses = slots.stream().map(slot -> normalizeStatus(slot.getStatus())).toList();
        if (statuses.contains("IN_PROGRESS")) return "IN_PROGRESS";
        if (statuses.stream().allMatch("COMPLETED"::equals)) return "COMPLETED";
        if (statuses.stream().allMatch(TERMINAL_STATES::contains)) {
            if (statuses.contains("COMPLETED")) return "COMPLETED";
            return statuses.stream().allMatch("CANCELLED"::equals) ? "CANCELLED" : "SKIPPED";
        }
        if (statuses.stream().anyMatch(TERMINAL_STATES::contains)) return "IN_PROGRESS";
        return "UPCOMING";
    }

    private String overallStatus(List<RoadmapPlanSlot> slots) {
        if (slots.isEmpty()) return "UPCOMING";
        List<String> statuses = slots.stream().map(slot -> normalizeStatus(slot.getStatus())).toList();
        if (statuses.contains("IN_PROGRESS")) return "IN_PROGRESS";
        if (statuses.stream().allMatch(TERMINAL_STATES::contains)) {
            if (statuses.contains("COMPLETED")) return "COMPLETED";
            return statuses.stream().allMatch("CANCELLED"::equals) ? "CANCELLED" : "SKIPPED";
        }
        return "UPCOMING";
    }

    private int count(List<RoadmapPlanSlot> slots, String... states) {
        List<String> accepted = List.of(states);
        return Math.toIntExact(slots.stream().filter(slot -> accepted.contains(normalizeStatus(slot.getStatus()))).count());
    }

    private String normalizeStatus(String status) {
        return "PLANNED".equals(status) ? "UPCOMING" : status;
    }

    private List<String> readJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (Exception ignored) { return List.of(); }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void capturePartialDuration(RoadmapPlanSlot slot) {
        if (slot.getStartedAt() != null && slot.getActualDurationMinutes() == null) {
            slot.setActualDurationMinutes(elapsedMinutes(slot.getStartedAt(), Instant.now()));
        }
    }

    private int elapsedMinutes(Instant start, Instant end) {
        long minutes = Duration.between(start, end).toMinutes();
        return Math.toIntExact(Math.max(1, Math.min(1440, minutes)));
    }

    private RoadmapPlanSlotResponse toResponse(RoadmapPlanSlot slot, LocalDate startDate) {
        LocalDate date = startDate == null ? null : startDate.plusDays(slot.getDayIndex());
        return new RoadmapPlanSlotResponse(slot.getId(), slot.getDayIndex(), date, slot.getSessionPeriod(),
                slot.getStartTime(), slot.getEndTime(), slot.getDurationMinutes(), slot.getActivityType(),
                slot.getActivity(), normalizeStatus(slot.getStatus()), slot.getStartedAt(), slot.getCompletedAt(),
                slot.getActualDurationMinutes(), slot.getNotes(), slot.getSkipReason());
    }
}
