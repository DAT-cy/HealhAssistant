package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapResponse;
import health_assistant.module.coach.dto.RoadmapSlotRequest;
import health_assistant.module.coach.dto.DailyReviewChanges;
import health_assistant.module.coach.dto.DailyScheduleChange;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapLifecycleService {
    private final UserProfileRepository profileRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPreviewService previewService;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public RoadmapResponse activate(String previewId, int optionIndex) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi kích hoạt lộ trình."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (profile.getHeightCm() == null || profile.getWeightKg() == null) {
            throw new IllegalArgumentException("Hãy nhập chiều cao và cân nặng trước khi kích hoạt lộ trình.");
        }

        RoadmapPreviewService.Selection selection = previewService.selectWithSchedule(
                previewId, userId, profile.getUpdatedAt(), optionIndex);
        GeminiRoadmapResponse selected = selection.plan();
        RoadmapRecord previous = roadmapRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        RoadmapRecord activated = createVersion(userId, previous, selected.title(), selected.overview(),
                selected.weeklyPlan(), selected.safetyNotes(), selected.source(),
                previous == null ? "INITIAL_PLAN" : "USER_CONFIRMED_NEW_PLAN",
                GeminiCoachService.PROMPT_VERSION, GeminiCoachService.SCHEMA_VERSION);
        saveSchedule(activated, selection.schedule());
        return toResponse(activated);
    }

    @Transactional
    public RoadmapResponse applyRecoveryAdjustment(Long baseRoadmapId, List<String> proposedWeeklyPlan) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ của tài khoản."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");

        RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .orElseThrow(() -> new EntityNotFoundException("Không có lộ trình đang hoạt động."));
        if (!active.getId().equals(baseRoadmapId)) {
            throw new IllegalArgumentException("Lộ trình đã thay đổi. Hãy tạo lại đề xuất điều chỉnh.");
        }
        if (proposedWeeklyPlan == null || proposedWeeklyPlan.size() != active.getDurationWeeks()) {
            throw new IllegalArgumentException("Phương án điều chỉnh không khớp thời lượng lộ trình hiện tại.");
        }
        List<String> safetyNotes = readJson(active.getSafetyNotes());
        if (!safetyNotes.contains("Đây là đề xuất giảm tải dựa trên nhật ký tự khai báo, không phải chẩn đoán.")) {
            safetyNotes = new java.util.ArrayList<>(safetyNotes);
            safetyNotes.add("Đây là đề xuất giảm tải dựa trên nhật ký tự khai báo, không phải chẩn đoán.");
        }
        List<RoadmapPlanSlot> priorSchedule = slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(active.getId());
        RoadmapRecord adjusted = createVersion(userId, active, active.getTitle(), active.getOverview(),
                proposedWeeklyPlan, safetyNotes, "rule-adjustment", "USER_CONFIRMED_RECOVERY_ADJUSTMENT",
                "RULES_V1", "ROADMAP_ADJUSTMENT_V1");
        slotRepository.saveAll(priorSchedule.stream().map(slot -> copySlot(slot, adjusted)).toList());
        return toResponse(adjusted);
    }

    @Transactional
    public RoadmapResponse applyDailyReviewAdjustment(Long baseRoadmapId, DailyReviewChanges changes) {
        return applyScheduleVersion(baseRoadmapId, changes, "USER_CONFIRMED_DAILY_REVIEW", "DAILY_REVIEW_ADJUSTMENT_V1");
    }

    @Transactional
    public RoadmapResponse applyRescheduleAdjustment(Long baseRoadmapId, DailyReviewChanges changes) {
        return applyScheduleVersion(baseRoadmapId, changes, "USER_CONFIRMED_AI_RESCHEDULE", "AI_RESCHEDULE_V1");
    }

    private RoadmapResponse applyScheduleVersion(Long baseRoadmapId, DailyReviewChanges changes,
                                                 String changeReason, String schemaVersion) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ của tài khoản."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .orElseThrow(() -> new EntityNotFoundException("Không có lộ trình đang hoạt động."));
        if (!active.getId().equals(baseRoadmapId) || !active.getId().equals(changes.baseRoadmapId())) {
            throw new IllegalArgumentException("Lộ trình đã thay đổi. Hãy tạo lại đánh giá hôm nay.");
        }
        if (active.getVersionNumber() != null && !active.getVersionNumber().equals(changes.baseVersionNumber())) {
            throw new IllegalArgumentException("Phiên bản lộ trình đã thay đổi. Hãy tạo lại đánh giá hôm nay.");
        }
        if (changes.scheduleChanges() == null || changes.scheduleChanges().isEmpty() || changes.scheduleChanges().size() > 30) {
            throw new IllegalArgumentException("Bản điều chỉnh không có thay đổi lịch hợp lệ.");
        }

        List<RoadmapPlanSlot> priorSlots = slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(active.getId());
        java.util.Map<Long, DailyScheduleChange> changeById = new java.util.HashMap<>();
        java.time.LocalDate today = LocalDate.now();
        for (DailyScheduleChange change : changes.scheduleChanges()) {
            if (change.dayIndex() < 0 || change.dayIndex() >= active.getDurationWeeks() * 7) {
                throw new IllegalArgumentException("Ngày điều chỉnh nằm ngoài lộ trình.");
            }
            RoadmapPlanSlot original = priorSlots.stream().filter(item -> item.getId().equals(change.slotId())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Chỉ được thay đổi slot trong roadmap đang hoạt động."));
            if (!"UPCOMING".equals(original.getStatus()) || original.getDayIndex() < ChronoUnit.DAYS.between(active.getStartDate(), today)) {
                throw new IllegalArgumentException("Chỉ được điều chỉnh hoạt động tương lai chưa bắt đầu.");
            }
            if (changeById.put(change.slotId(), change) != null) throw new IllegalArgumentException("Không được đề xuất trùng một slot.");
            if (!List.of("MORNING", "AFTERNOON", "EVENING").contains(change.sessionPeriod())
                    || !change.endTime().isAfter(change.startTime())) throw new IllegalArgumentException("Buổi hoặc giờ điều chỉnh không hợp lệ.");
            long minutes = java.time.Duration.between(change.startTime(), change.endTime()).toMinutes();
            if (minutes < 15 || minutes > 240) throw new IllegalArgumentException("Slot điều chỉnh phải dài từ 15 đến 240 phút.");
            validateSessionPeriod(change);
        }

        RoadmapRecord newVersion = createVersion(userId, active, active.getTitle(), active.getOverview(),
                readJsonWeeklyPlan(active.getWeeklyPlan()), readJson(active.getSafetyNotes()), "gemini-reschedule", changeReason,
                GeminiCoachService.PROMPT_VERSION, schemaVersion);
        newVersion.setStartDate(active.getStartDate());
        RoadmapRecord adjustedVersion = roadmapRepository.save(newVersion);
        List<RoadmapPlanSlot> replacements = priorSlots.stream().filter(slot -> !"CANCEL".equals(changeById.containsKey(slot.getId())
                        ? changeById.get(slot.getId()).action() : ""))
                .map(slot -> copyWithDailyChange(slot, adjustedVersion, changeById.get(slot.getId()), true)).toList();
        slotRepository.saveAll(replacements);
        return toResponse(adjustedVersion);
    }

    @Transactional(readOnly = true)
    public RoadmapResponse active() {
        Long userId = SecurityUtils.getCurrentUserId();
        return roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tài khoản chưa có lộ trình đang hoạt động."));
    }

    @Transactional(readOnly = true)
    public List<RoadmapResponse> history() {
        Long userId = SecurityUtils.getCurrentUserId();
        return roadmapRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RoadmapResponse getMine(Long id) {
        return roadmapRepository.findByIdAndUserId(id, SecurityUtils.getCurrentUserId())
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu nội dung lộ trình.", exception);
        }
    }

    private RoadmapRecord createVersion(Long userId, RoadmapRecord previous, String title, String overview,
                                        List<String> weeklyPlan, List<String> safetyNotes, String source,
                                        String reason, String promptVersion, String schemaVersion) {
        long existingVersionCount = roadmapRepository.countByUserId(userId);
        if (previous != null && previous.getVersionNumber() == null) {
            previous.setVersionNumber(Math.toIntExact(existingVersionCount));
            roadmapRepository.save(previous);
        }
        roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").ifPresent(active -> {
            active.setStatus("ARCHIVED");
            roadmapRepository.save(active);
        });

        RoadmapRecord record = new RoadmapRecord();
        record.setUserId(userId);
        record.setTitle(title);
        record.setOverview(overview);
        record.setWeeklyPlan(writeJson(weeklyPlan));
        record.setSafetyNotes(writeJson(safetyNotes));
        record.setSource(source);
        record.setStatus("ACTIVE");
        record.setStartDate(LocalDate.now());
        record.setDurationWeeks(weeklyPlan.size());
        record.setVersionNumber(Math.toIntExact(existingVersionCount + 1));
        record.setPreviousRoadmapId(previous == null ? null : previous.getId());
        record.setChangeReason(reason);
        record.setPromptVersion(promptVersion);
        record.setSchemaVersion(schemaVersion);
        record.setCreatedAt(Instant.now());
        return roadmapRepository.save(record);
    }

    private void saveSchedule(RoadmapRecord roadmap, List<RoadmapSlotRequest> weeklySchedule) {
        if (weeklySchedule == null || weeklySchedule.isEmpty()) return;
        List<RoadmapPlanSlot> slots = new java.util.ArrayList<>();
        int startDayOfWeek = roadmap.getStartDate().getDayOfWeek().getValue();
        for (int week = 0; week < roadmap.getDurationWeeks(); week++) {
            for (RoadmapSlotRequest source : weeklySchedule) {
                RoadmapPlanSlot slot = new RoadmapPlanSlot();
                slot.setRoadmap(roadmap);
                int firstOccurrenceOffset = Math.floorMod(source.dayOfWeek() - startDayOfWeek, 7);
                slot.setDayIndex(week * 7 + firstOccurrenceOffset);
                slot.setSessionPeriod(source.sessionPeriod());
                slot.setStartTime(source.startTime());
                slot.setEndTime(source.endTime());
                slot.setDurationMinutes(Math.toIntExact(java.time.Duration.between(source.startTime(), source.endTime()).toMinutes()));
                slot.setActivityType(source.activityType());
                slot.setActivity(source.activity());
                slots.add(slot);
            }
        }
        slotRepository.saveAll(slots);
    }

    private RoadmapPlanSlot copySlot(RoadmapPlanSlot source, RoadmapRecord roadmap) {
        RoadmapPlanSlot copy = new RoadmapPlanSlot();
        copy.setRoadmap(roadmap);
        copy.setDayIndex(source.getDayIndex());
        copy.setSessionPeriod(source.getSessionPeriod());
        copy.setStartTime(source.getStartTime());
        copy.setEndTime(source.getEndTime());
        copy.setDurationMinutes(source.getDurationMinutes());
        copy.setActivityType(source.getActivityType());
        copy.setActivity(source.getActivity());
        copy.setStatus("UPCOMING");
        return copy;
    }

    private RoadmapPlanSlot copyWithDailyChange(RoadmapPlanSlot source, RoadmapRecord roadmap, DailyScheduleChange change) {
        return copyWithDailyChange(source, roadmap, change, false);
    }

    private RoadmapPlanSlot copyWithDailyChange(RoadmapPlanSlot source, RoadmapRecord roadmap,
                                                DailyScheduleChange change, boolean preserveProgress) {
        RoadmapPlanSlot copy = preserveProgress ? copySlotWithProgress(source, roadmap) : copySlot(source, roadmap);
        if (change == null) return copy;
        copy.setDayIndex(change.dayIndex());
        copy.setSessionPeriod(change.sessionPeriod());
        copy.setStartTime(change.startTime());
        copy.setEndTime(change.endTime());
        copy.setDurationMinutes(Math.toIntExact(java.time.Duration.between(change.startTime(), change.endTime()).toMinutes()));
        copy.setActivityType(change.activityType());
        copy.setActivity(change.activity());
        copy.setNotes("Điều chỉnh theo đánh giá ngày: " + change.reason());
        return copy;
    }

    private RoadmapPlanSlot copySlotWithProgress(RoadmapPlanSlot source, RoadmapRecord roadmap) {
        RoadmapPlanSlot copy = copySlot(source, roadmap);
        copy.setStatus(source.getStatus());
        copy.setStartedAt(source.getStartedAt());
        copy.setCompletedAt(source.getCompletedAt());
        copy.setActualDurationMinutes(source.getActualDurationMinutes());
        copy.setSkipReason(source.getSkipReason());
        copy.setNotes(source.getNotes());
        return copy;
    }

    private void validateSessionPeriod(DailyScheduleChange change) {
        java.time.LocalTime noon = java.time.LocalTime.NOON;
        java.time.LocalTime evening = java.time.LocalTime.of(18, 0);
        boolean valid = switch (change.sessionPeriod()) {
            case "MORNING" -> change.startTime().isBefore(noon) && !change.endTime().isAfter(noon);
            case "AFTERNOON" -> !change.startTime().isBefore(noon) && !change.startTime().isAfter(evening)
                    && change.endTime().isAfter(noon) && !change.endTime().isAfter(evening);
            case "EVENING" -> !change.startTime().isBefore(evening) && change.endTime().isAfter(evening);
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException("Giờ mới không nằm trong buổi được chọn.");
    }

    private List<String> readJsonWeeklyPlan(String value) {
        try { return objectMapper.readValue(value, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Dữ liệu kế hoạch tuần không hợp lệ.", exception); }
    }

    private List<String> readJson(String value) {
        try {
            return objectMapper.readValue(value, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Dữ liệu safety notes của lộ trình không hợp lệ.", exception);
        }
    }

    private RoadmapResponse toResponse(RoadmapRecord record) {
        return new RoadmapResponse(record.getId(), record.getTitle(), record.getOverview(), record.getWeeklyPlan(),
                record.getSafetyNotes(), record.getSource(), record.getStatus(), record.getStartDate(),
                record.getDurationWeeks(), record.getVersionNumber(), record.getPreviousRoadmapId(),
                record.getChangeReason(), record.getPromptVersion(), record.getSchemaVersion(), record.getCreatedAt());
    }
}
