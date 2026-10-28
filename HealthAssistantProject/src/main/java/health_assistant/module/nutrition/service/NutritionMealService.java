package health_assistant.module.nutrition.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.dailyplan.service.MealAnalysisService;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.module.nutrition.dto.MealAnalysisLogResponse;
import health_assistant.module.nutrition.dto.MealAnalysisRequest;
import health_assistant.module.nutrition.dto.MealLogResponse;
import health_assistant.module.nutrition.dto.MealRecommendationResponse;
import health_assistant.module.nutrition.entity.MealLog;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NutritionMealService {
    private static final Set<String> MEAL_TYPES = Set.of("BREAKFAST", "LUNCH", "DINNER");

    private final MealAnalysisService analysisService;
    private final MealLogRepository mealRepository;
    private final MealLogService mealLogService;
    private final UserProfileRepository profileRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final CloudinaryUploadService cloudinaryUploadService;
    private final ObjectMapper objectMapper;

    public MealAnalysisLogResponse analyze(Long userId, MultipartFile image, MealAnalysisRequest request) {
        validateRequest(request);
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        PlanningContext planning = resolvePlanningContext(userId, request.roadmapId(), request.planDayIndex(), request.mealDate());
        MealAnalysisService.MealContext context = createContext(request.mealType(), request.mealDate(), request.plannedMeal(),
                request.dishName(), request.portionNotes(), request.ingredients(), profile, planning);

        var analysis = analysisService.analyze(image, context);
        CloudinaryUploadService.UploadedMealPhoto photo = cloudinaryUploadService.uploadMealPhoto(userId, image);
        try {
            MealLog log = new MealLog();
            log.setUserId(userId);
            log.setLoggedAt(LocalDateTime.now());
            log.setMealDate(request.mealDate());
            log.setMealType(request.mealType());
            log.setStatus("ANALYZED");
            log.setRoadmapId(planning.roadmap() == null ? null : planning.roadmap().getId());
            log.setPlanDayIndex(planning.dayIndex());
            log.setPlannedMeal(blankToNull(request.plannedMeal()));
            log.setDishName(blankToNull(request.dishName()));
            log.setPortionNotes(blankToNull(request.portionNotes()));
            log.setIngredients(blankToNull(request.ingredients()));
            log.setPhotoUrl(photo.secureUrl());
            log.setPhotoPublicId(photo.publicId());
            log.setNotes(analysis.summary().substring(0, Math.min(1000, analysis.summary().length())));
            log.setRecommendationSource(analysis.source());
            log.setAnalysisJson(writeAnalysis(analysis));
            MealLog saved = mealRepository.saveAndFlush(log);
            return new MealAnalysisLogResponse(mealLogService.toResponse(saved), analysis);
        } catch (RuntimeException exception) {
            try { cloudinaryUploadService.deleteMealPhoto(userId, photo.publicId()); }
            catch (RuntimeException cleanupException) { log.warn("Could not remove unlinked meal image after database failure."); }
            throw exception;
        }
    }

    public MealRecommendationResponse recommendation(Long userId, LocalDate date, String mealType, Long requestedRoadmapId) {
        validateMealType(mealType);
        LocalDate mealDate = date == null ? LocalDate.now() : date;
        Long roadmapId = requestedRoadmapId;
        if (roadmapId == null) {
            roadmapId = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                    .map(RoadmapRecord::getId).orElse(null);
        }
        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        PlanningContext planning = resolvePlanningContext(userId, roadmapId, null, mealDate);
        return analysisService.recommend(createContext(mealType, mealDate, "", "", "", "", profile, planning));
    }

    @Transactional
    public MealLogResponse markReviewed(Long userId, Long mealLogId) {
        MealLog meal = mealRepository.findByIdAndUserIdForUpdate(mealLogId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lần phân tích bữa ăn của tài khoản này."));
        if ("REVIEWED".equals(meal.getStatus())) return mealLogService.toResponse(meal);
        if (!"ANALYZED".equals(meal.getStatus())) throw new IllegalArgumentException("Chỉ có thể xác nhận một kết quả đang chờ xem.");
        meal.setStatus("REVIEWED");
        meal.setReviewedAt(LocalDateTime.now());
        return mealLogService.toResponse(mealRepository.saveAndFlush(meal));
    }

    @Transactional
    public void discard(Long userId, Long mealLogId) {
        MealLog meal = mealRepository.findByIdAndUserIdForUpdate(mealLogId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lần phân tích bữa ăn của tài khoản này."));
        if (!"ANALYZED".equals(meal.getStatus())) throw new IllegalArgumentException("Chỉ có thể hủy kết quả chưa được xác nhận.");
        if (meal.getPhotoPublicId() != null) cloudinaryUploadService.deleteMealPhoto(userId, meal.getPhotoPublicId());
        mealRepository.delete(meal);
    }

    private void validateRequest(MealAnalysisRequest request) {
        validateMealType(request.mealType());
        if (request.mealDate() == null) throw new IllegalArgumentException("Ngày bữa ăn là bắt buộc.");
        requireLength(request.plannedMeal(), 240, "Bữa ăn dự kiến");
        requireLength(request.dishName(), 180, "Tên món");
        requireLength(request.portionNotes(), 500, "Khẩu phần");
        requireLength(request.ingredients(), 500, "Nguyên liệu");
        if (request.planDayIndex() != null && request.roadmapId() == null) {
            throw new IllegalArgumentException("Cần có lộ trình khi liên kết ngày kế hoạch.");
        }
    }

    private void requireLength(String value, int max, String field) {
        if (value != null && value.length() > max) throw new IllegalArgumentException(field + " vượt quá " + max + " ký tự.");
    }

    private void validateMealType(String mealType) {
        if (mealType == null || !MEAL_TYPES.contains(mealType)) throw new IllegalArgumentException("Loại bữa ăn không hợp lệ.");
    }

    private PlanningContext resolvePlanningContext(Long userId, Long roadmapId, Integer requestedDayIndex, LocalDate date) {
        if (roadmapId == null) return new PlanningContext(null, null, "", List.of());
        RoadmapRecord roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null) {
            throw new IllegalStateException("Lộ trình chưa có thời gian hợp lệ.");
        }
        int dayIndex = Math.toIntExact(ChronoUnit.DAYS.between(roadmap.getStartDate(), date));
        if (dayIndex < 0 || dayIndex >= roadmap.getDurationWeeks() * 7) {
            throw new IllegalArgumentException("Ngày bữa ăn nằm ngoài thời lượng lộ trình.");
        }
        if (requestedDayIndex != null && requestedDayIndex != dayIndex) {
            throw new IllegalArgumentException("Ngày kế hoạch không khớp với ngày bữa ăn.");
        }
        List<String> weeklyPlan = readJsonList(roadmap.getWeeklyPlan());
        String weeklyFocus = dayIndex / 7 < weeklyPlan.size() ? weeklyPlan.get(dayIndex / 7) : "";
        List<String> scheduled = slotRepository.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(roadmapId, dayIndex).stream()
                .map(this::describeSlot).toList();
        return new PlanningContext(roadmap, dayIndex, weeklyFocus, scheduled);
    }

    private String describeSlot(RoadmapPlanSlot slot) {
        return slot.getSessionPeriod() + " " + slot.getStartTime() + "-" + slot.getEndTime() + " " + slot.getActivity();
    }

    private MealAnalysisService.MealContext createContext(String mealType, LocalDate date, String plannedMeal,
                                                           String dishName, String portionNotes, String ingredients,
                                                           UserProfile profile, PlanningContext planning) {
        String limitations = profile == null ? "" : String.join("; ",
                profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                profile.getPainAreas() == null ? "" : profile.getPainAreas());
        return new MealAnalysisService.MealContext(mealType, date, plannedMeal, dishName, portionNotes, ingredients,
                profile == null ? "" : profile.getGoal(), profile == null ? "" : profile.getActivityLevel(),
                limitations, planning.weeklyFocus(), planning.scheduledActivities());
    }

    private List<String> readJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (JsonProcessingException ignored) { return List.of(); }
    }

    private String writeAnalysis(health_assistant.module.dailyplan.dto.MealAnalysisResponse analysis) {
        try { return objectMapper.writeValueAsString(analysis); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Không thể lưu kết quả phân tích bữa ăn.", exception); }
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record PlanningContext(RoadmapRecord roadmap, Integer dayIndex, String weeklyFocus, List<String> scheduledActivities) {}
}
