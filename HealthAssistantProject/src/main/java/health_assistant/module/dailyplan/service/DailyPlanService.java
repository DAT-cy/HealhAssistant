package health_assistant.module.dailyplan.service;

import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.dailyplan.entity.DailyPlan;
import health_assistant.module.dailyplan.repository.DailyPlanRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DailyPlanService {
    private static final Duration AI_RETRY_COOLDOWN = Duration.ofMinutes(1);
    private final UserProfileRepository profileRepository;
    private final DailyPlanRepository dailyPlanRepository;
    private final ObjectMapper objectMapper;
    private final GeminiDailyPlanService geminiDailyPlanService;

    public DailyPlanResponse today() {
        return today(SecurityUtils.getCurrentUserId(), LocalDate.now());
    }

    DailyPlanResponse today(Long userId, LocalDate today) {
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, today);
        return dailyPlanRepository.findByUserIdAndPlanDate(userId, today)
                .map(this::toResponse)
                .orElseGet(() -> createToday(userId, today, profile));
    }

    public DailyPlanResponse generateToday() {
        Long userId = SecurityUtils.getCurrentUserId();
        LocalDate today = LocalDate.now();
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, today);
        DailyPlan existing = dailyPlanRepository.findByUserIdAndPlanDate(userId, today).orElse(null);
        if (existing != null && "gemini".equals(existing.getSource())) return toResponse(existing);
        if (existing != null && "fallback-ai-unavailable".equals(existing.getSource())
                && existing.getCreatedAt().isAfter(Instant.now().minus(AI_RETRY_COOLDOWN))) {
            return toResponse(existing);
        }
        if (profile == null || !profile.isConsent() || !geminiDailyPlanService.isConfigured()) {
            return existing == null ? createToday(userId, today, profile) : toResponse(existing);
        }

        var generated = geminiDailyPlanService.generate(profile);
        if (generated.isPresent()) return saveGenerated(userId, today, generated.get());

        if (existing != null) {
            existing.setSource("fallback-ai-unavailable");
            existing.setCreatedAt(Instant.now());
            return toResponse(dailyPlanRepository.save(existing));
        }
        return saveFallback(userId, today, "fallback-ai-unavailable");
    }

    private DailyPlanResponse createToday(Long userId, LocalDate today, UserProfile profile) {
        if (hasReportedPain(profile)) return saveSafetyPlan(userId, today);
        var generated = profile != null && profile.isConsent() && geminiDailyPlanService.isConfigured()
                ? geminiDailyPlanService.generate(profile).orElse(null)
                : null;
        if (generated != null) return saveGenerated(userId, today, generated);

        String source = profile == null ? "fallback-no-profile"
                : profile.isConsent() && geminiDailyPlanService.isConfigured()
                    ? "fallback-ai-unavailable"
                : "saved-template";
        return saveFallback(userId, today, source);
    }

    private boolean hasReportedPain(UserProfile profile) {
        return profile != null && profile.getPainAreas() != null && !profile.getPainAreas().isBlank();
    }

    private DailyPlanResponse saveSafetyPlan(Long userId, LocalDate today) {
        DailyPlan plan = dailyPlanRepository.findByUserIdAndPlanDate(userId, today).orElseGet(DailyPlan::new);
        plan.setUserId(userId);
        plan.setPlanDate(today);
        plan.setTitle("Hôm nay ưu tiên nghỉ ngơi");
        plan.setDuration("Hôm nay");
        plan.setActivities(writeJson(List.of("Tạm dừng bài tập gây khó chịu; không cố tập xuyên cảm giác đau.")));
        plan.setSafetyNotes(writeJson(List.of("Chỉ tiếp tục vận động khi cảm thấy ổn. Tìm hỗ trợ chuyên môn phù hợp nếu cần.")));
        plan.setSource("safety-rule");
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan));
    }

    private DailyPlanResponse saveFallback(Long userId, LocalDate today, String source) {
        List<String> activities = List.of(
                "Khởi động nhẹ trong 5 phút",
                "Squat cơ bản: 3 hiệp, mỗi hiệp 8 lần; nghỉ khi cần",
                "Giãn cơ nhẹ trong 8 phút");
        List<String> safetyNotes = List.of(
                "Đây là kế hoạch mẫu hỗ trợ vận động, không phải tư vấn y khoa.",
                "Tập ở cường độ vừa; nếu cảm thấy đau hoặc khó chịu, hãy dừng lại.");
        DailyPlan plan = new DailyPlan();
        plan.setUserId(userId);
        plan.setPlanDate(today);
        plan.setTitle("Buổi tập nền tảng");
        plan.setDuration("25 phút");
        plan.setActivities(writeJson(activities));
        plan.setSafetyNotes(writeJson(safetyNotes));
        plan.setSource(source);
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan));
    }

    private DailyPlanResponse saveGenerated(Long userId, LocalDate today,
            GeminiDailyPlanService.GeneratedDailyPlan generated) {
        DailyPlan plan = dailyPlanRepository.findByUserIdAndPlanDate(userId, today).orElseGet(DailyPlan::new);
        plan.setUserId(userId);
        plan.setPlanDate(today);
        plan.setTitle(generated.title());
        plan.setDuration(generated.duration());
        plan.setActivities(writeJson(generated.activities()));
        plan.setSafetyNotes(writeJson(generated.safetyNotes()));
        plan.setSource("gemini");
        plan.setCreatedAt(Instant.now());
        return toResponse(dailyPlanRepository.save(plan));
    }

    private DailyPlanResponse toResponse(DailyPlan plan) {
        return new DailyPlanResponse(plan.getPlanDate().toString(), plan.getTitle(), plan.getDuration(),
                readJson(plan.getActivities()), readJson(plan.getSafetyNotes()), plan.getSource());
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
