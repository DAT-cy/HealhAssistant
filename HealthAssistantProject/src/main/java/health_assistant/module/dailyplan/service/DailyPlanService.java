package health_assistant.module.dailyplan.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.availability.entity.AvailabilitySlot;
import health_assistant.module.availability.repository.AvailabilitySlotRepository;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.dailyplan.entity.DailyPlan;
import health_assistant.module.dailyplan.repository.DailyPlanRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class DailyPlanService {
    private static final Duration AI_RETRY_COOLDOWN = Duration.ofMinutes(1);
    private static final Pattern DURATION_PATTERN = Pattern.compile("^(\\d{1,2})\\s*phút$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> NO_PAIN_VALUES = Set.of("không có", "khong co", "none", "n/a");

    private final UserProfileRepository profileRepository;
    private final DailyPlanRepository dailyPlanRepository;
    private final AvailabilitySlotRepository availabilityRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final ObjectMapper objectMapper;
    private final GeminiDailyPlanService geminiDailyPlanService;

    public DailyPlanResponse today() {
        return today(SecurityUtils.getCurrentUserId(), LocalDate.now());
    }

    public DailyPlanResponse forDate(LocalDate date) {
        return today(SecurityUtils.getCurrentUserId(), date == null ? LocalDate.now() : date);
    }

    DailyPlanResponse today(Long userId, LocalDate date) {
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, date);
        return dailyPlanRepository.findByUserIdAndPlanDate(userId, date)
                .map(plan -> toResponse(plan, userId))
                .orElseGet(() -> createPlan(userId, date, profile));
    }

    public DailyPlanResponse generateToday() {
        return generateForDate(SecurityUtils.getCurrentUserId(), LocalDate.now());
    }

    public DailyPlanResponse generateForDate(LocalDate date) {
        return generateForDate(SecurityUtils.getCurrentUserId(), date == null ? LocalDate.now() : date);
    }

    private DailyPlanResponse generateForDate(Long userId, LocalDate date) {
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, date);
        AvailabilitySlot slot = scheduledSlot(userId, date);
        if (slot == null || availableMinutes(slot) < 10) return saveRestPlan(userId, date);

        DailyPlan existing = dailyPlanRepository.findByUserIdAndPlanDate(userId, date).orElse(null);
        if (existing != null && "gemini".equals(existing.getSource())) return toResponse(existing, userId);
        if (existing != null && "fallback-ai-unavailable".equals(existing.getSource())
                && existing.getCreatedAt().isAfter(Instant.now().minus(AI_RETRY_COOLDOWN))) {
            return toResponse(existing, userId);
        }
        if (profile == null || !profile.isConsent() || !geminiDailyPlanService.isConfigured()) {
            return existing == null ? saveFallback(userId, date, "fallback-no-profile", slot) : toResponse(existing, userId);
        }

        var generated = geminiDailyPlanService.generate(profile, slot, weeklyFocus(userId, date));
        if (generated.isPresent()) return saveGenerated(userId, date, generated.get());
        if (existing != null) {
            existing.setSource("fallback-ai-unavailable");
            existing.setCreatedAt(Instant.now());
            return toResponse(dailyPlanRepository.save(existing), userId);
        }
        return saveFallback(userId, date, "fallback-ai-unavailable", slot);
    }

    private DailyPlanResponse createPlan(Long userId, LocalDate date, UserProfile profile) {
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, date);
        AvailabilitySlot slot = scheduledSlot(userId, date);
        if (slot == null || availableMinutes(slot) < 10) {
            return profile == null ? saveFallback(userId, date, "fallback-no-profile", null) : saveRestPlan(userId, date);
        }
        var generated = profile != null && profile.isConsent() && geminiDailyPlanService.isConfigured()
                ? geminiDailyPlanService.generate(profile, slot, weeklyFocus(userId, date)).orElse(null)
                : null;
        if (generated != null) return saveGenerated(userId, date, generated);

        String source = profile == null ? "fallback-no-profile"
                : profile.isConsent() && geminiDailyPlanService.isConfigured() ? "fallback-ai-unavailable" : "saved-template";
        return saveFallback(userId, date, source, slot);
    }

    private boolean hasReportedPain(UserProfile profile) {
        if (profile == null || profile.getPainAreas() == null || profile.getPainAreas().isBlank()) return false;
        return !NO_PAIN_VALUES.contains(profile.getPainAreas().trim().toLowerCase(Locale.ROOT));
    }

    private DailyPlanResponse saveSafetyPlan(Long userId, LocalDate date) {
        DailyPlan plan = dailyPlanRepository.findByUserIdAndPlanDate(userId, date).orElseGet(DailyPlan::new);
        plan.setUserId(userId);
        plan.setPlanDate(date);
        plan.setTitle("Hôm nay ưu tiên nghỉ ngơi");
        plan.setDuration("Hôm nay");
        plan.setActivities(writeJson(List.of("Tạm dừng bài tập gây khó chịu; không cố tập xuyên cảm giác đau.")));
        plan.setSafetyNotes(writeJson(List.of("Chỉ tiếp tục vận động khi cảm thấy ổn. Tìm hỗ trợ chuyên môn phù hợp nếu cần.")));
        plan.setSource("safety-rule");
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan), userId);
    }

    private DailyPlanResponse saveRestPlan(Long userId, LocalDate date) {
        DailyPlan plan = dailyPlanRepository.findByUserIdAndPlanDate(userId, date).orElseGet(DailyPlan::new);
        plan.setUserId(userId);
        plan.setPlanDate(date);
        plan.setTitle("Ngày nghỉ theo lịch");
        plan.setDuration("Nghỉ");
        plan.setActivities(writeJson(List.of("Không có buổi vận động đã xếp vào ngày này.")));
        plan.setSafetyNotes(writeJson(List.of("Có thể thêm hoặc đổi khung giờ trong hồ sơ.")));
        plan.setSource("rest-day");
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan), userId);
    }

    private DailyPlanResponse saveFallback(Long userId, LocalDate date, String source, AvailabilitySlot slot) {
        int minutes = slot == null ? 25 : Math.max(10, Math.min(25, availableMinutes(slot)));
        List<String> activities = slot != null && "WALKING".equals(slot.getActivityType())
                ? List.of("Khởi động nhẹ trong 5 phút", "Đi bộ ở nhịp độ vừa sức trong " + (minutes - 8) + " phút", "Thả lỏng trong 3 phút")
                : slot != null && "MOBILITY".equals(slot.getActivityType())
                    ? List.of("Khởi động khớp nhẹ trong 5 phút", "Thực hiện các động tác linh hoạt trong " + (minutes - 8) + " phút", "Thả lỏng trong 3 phút")
                    : minutes < 25
                        ? List.of("Khởi động nhẹ trong 3 phút", "Ngồi xuống và đứng lên có kiểm soát trong " + Math.max(2, minutes - 6) + " phút", "Thả lỏng trong 3 phút")
                        : List.of("Khởi động nhẹ trong 5 phút", "Squat cơ bản: 3 hiệp, mỗi hiệp 8 lần; nghỉ khi cần", "Giãn cơ nhẹ trong 8 phút");
        List<String> safetyNotes = List.of(
                "Đây là kế hoạch mẫu hỗ trợ vận động, không phải tư vấn y khoa.",
                "Tập ở cường độ vừa; nếu cảm thấy đau hoặc khó chịu, hãy dừng lại.");
        DailyPlan plan = new DailyPlan();
        plan.setUserId(userId);
        plan.setPlanDate(date);
        plan.setTitle("Buổi tập nền tảng");
        plan.setDuration(minutes + " phút");
        plan.setActivities(writeJson(activities));
        plan.setSafetyNotes(writeJson(safetyNotes));
        plan.setSource(source);
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan), userId);
    }

    private DailyPlanResponse saveGenerated(Long userId, LocalDate date,
            GeminiDailyPlanService.GeneratedDailyPlan generated) {
        DailyPlan plan = dailyPlanRepository.findByUserIdAndPlanDate(userId, date).orElseGet(DailyPlan::new);
        plan.setUserId(userId);
        plan.setPlanDate(date);
        plan.setTitle(generated.title());
        plan.setDuration(generated.duration());
        plan.setActivities(writeJson(generated.activities()));
        plan.setSafetyNotes(writeJson(generated.safetyNotes()));
        plan.setSource("gemini");
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan), userId);
    }

    private DailyPlanResponse toResponse(DailyPlan plan, Long userId) {
        AvailabilitySlot slot = "safety-rule".equals(plan.getSource()) || "rest-day".equals(plan.getSource())
                ? null : scheduledSlot(userId, plan.getPlanDate());
        LocalTime scheduledEnd = slot == null ? null : scheduledEnd(plan.getDuration(), slot);
        return new DailyPlanResponse(plan.getPlanDate().toString(), plan.getTitle(), plan.getDuration(),
                readJson(plan.getActivities()), readJson(plan.getSafetyNotes()), plan.getSource(),
                slot == null ? null : slot.getStartTime().toString(), scheduledEnd == null ? null : scheduledEnd.toString(),
                slot == null ? null : slot.getActivityType(), slot == null ? null : slot.getLocationType());
    }

    private AvailabilitySlot scheduledSlot(Long userId, LocalDate date) {
        return availabilityRepository.findAllByUserIdAndDayOfWeekAndActiveTrueOrderByStartTimeAsc(userId, date.getDayOfWeek().getValue())
                .stream().findFirst().orElse(null);
    }

    private String weeklyFocus(Long userId, LocalDate date) {
        RoadmapRecord roadmap = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").orElse(null);
        if (roadmap == null || roadmap.getWeeklyPlan() == null || roadmap.getWeeklyPlan().isBlank()) return null;
        try {
            List<String> weeks = objectMapper.readValue(roadmap.getWeeklyPlan(), new TypeReference<>() { });
            long elapsedDays = roadmap.getStartDate() == null || date.isBefore(roadmap.getStartDate())
                    ? 0 : ChronoUnit.DAYS.between(roadmap.getStartDate(), date);
            int weekIndex = Math.toIntExact(elapsedDays / 7);
            return weekIndex < weeks.size() ? weeks.get(weekIndex) : null;
        } catch (JsonProcessingException | ArithmeticException exception) {
            return null;
        }
    }

    private int availableMinutes(AvailabilitySlot slot) {
        return Math.toIntExact(Duration.between(slot.getStartTime(), slot.getEndTime()).toMinutes());
    }

    private LocalTime scheduledEnd(String duration, AvailabilitySlot slot) {
        Matcher matcher = DURATION_PATTERN.matcher(duration == null ? "" : duration);
        if (!matcher.matches()) return slot.getEndTime();
        LocalTime requestedEnd = slot.getStartTime().plusMinutes(Integer.parseInt(matcher.group(1)));
        return requestedEnd.isAfter(slot.getEndTime()) ? slot.getEndTime() : requestedEnd;
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu nội dung kế hoạch.", exception);
        }
    }

    private List<String> readJson(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Dữ liệu kế hoạch đã lưu không hợp lệ.", exception);
        }
    }
}
