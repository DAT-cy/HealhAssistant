package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.ai.service.AiPromptSanitizer;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.dto.DailyAiReviewResponse;
import health_assistant.module.coach.dto.DailyReviewChanges;
import health_assistant.module.coach.dto.DailyScheduleChange;
import health_assistant.module.coach.entity.DailyAiReview;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.DailyAiReviewRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.nutrition.entity.MealLog;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.entity.DailyCheckin;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.module.workout.entity.ActivitySession;
import health_assistant.module.workout.entity.WorkoutSession;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyAiReviewService {
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION";
    private static final String NO_CHANGE = "NO_CHANGE";

    private final DailyAiReviewRepository reviewRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ActivitySessionRepository activityRepository;
    private final WorkoutSessionRepository workoutRepository;
    private final MealLogRepository mealRepository;
    private final DailyCheckinRepository checkinRepository;
    private final UserProfileRepository profileRepository;
    private final RoadmapLifecycleService lifecycleService;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public DailyAiReviewResponse evaluate(Long userId, LocalDate requestedDate) {
        LocalDate date = requestedDate == null ? LocalDate.now(USER_ZONE) : requestedDate;
        if (date.isAfter(LocalDate.now(USER_ZONE))) throw new IllegalArgumentException("Chỉ có thể đánh giá hôm nay hoặc ngày đã qua.");

        RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .orElseThrow(() -> new IllegalArgumentException("Chưa có lộ trình đang hoạt động."));
        active = roadmapRepository.findByIdAndUserIdForUpdate(active.getId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("Lộ trình đang hoạt động không còn tồn tại."));
        DailyAiReview existing = reviewRepository.findForDateAndRoadmapForUpdate(userId, date, active.getId()).orElse(null);
        if (existing != null) return toResponse(existing);

        UserProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (profile == null || !profile.isConsent()) {
            throw new IllegalArgumentException("Cần có hồ sơ và đồng ý sử dụng dữ liệu trước khi đánh giá cuối ngày.");
        }
        DailyCheckin checkin = checkinRepository.findByUserIdAndCheckInDate(userId, date).orElse(null);
        int dayIndex = dayIndex(active, date);
        List<RoadmapPlanSlot> slots = slotRepository.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(active.getId(), dayIndex);
        List<ActivitySession> activitySessions = activityRepository.findAllByRoadmapIdAndUserIdOrderByStartedAtDesc(active.getId(), userId)
                .stream().filter(session -> session.getStartedAt() != null && session.getStartedAt().atZone(USER_ZONE).toLocalDate().equals(date)).toList();
        List<WorkoutSession> gymSessions = slots.stream().flatMap(slot -> workoutRepository.findAllByPlanSlotIdAndUserId(slot.getId(), userId).stream())
                .filter(session -> session.getStartedAt() != null && session.getStartedAt().atZone(USER_ZONE).toLocalDate().equals(date)).toList();
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        List<MealLog> meals = mealRepository.findAllForUserAndDate(userId, date, from, to);
        List<RoadmapPlanSlot> futureSlots = slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(active.getId()).stream()
                .filter(slot -> slot.getDayIndex() > dayIndex && "UPCOMING".equals(normalizeStatus(slot.getStatus()))).toList();

        JsonNode snapshot = snapshot(active, profile, date, dayIndex, slots, activitySessions, gymSessions, meals, checkin, futureSlots);
        boolean useGemini = geminiClient.isConfigured();
        JsonNode evaluation = useGemini ? generate(snapshot, futureSlots) : fallback(snapshot, futureSlots);
        DailyReviewChanges proposedChanges;
        try {
            proposedChanges = parseAndValidateChanges(evaluation.path("scheduleChanges"), active, date, futureSlots);
        } catch (IllegalArgumentException invalidProposal) {
            log.warn("Daily review schedule proposal rejected ({})", invalidProposal.getMessage());
            proposedChanges = new DailyReviewChanges(active.getId(), active.getVersionNumber(), List.of());
            if (evaluation instanceof ObjectNode object) {
                object.put("needsScheduleAdjustment", false);
                object.put("recommendation", "AI có đề xuất thay đổi nhưng lịch không hợp lệ hoặc bị trùng; không áp dụng thay đổi nào. Tiếp tục lịch hiện tại và đánh giá lại sau.");
                object.putArray("scheduleChanges");
                if (object.path("suggestions") instanceof ArrayNode suggestions) {
                    suggestions.add("Giữ nguyên lịch hiện tại vì đề xuất thay đổi không vượt qua kiểm tra thời gian.");
                } else {
                    object.putArray("suggestions").add("Giữ nguyên lịch hiện tại vì đề xuất thay đổi không vượt qua kiểm tra thời gian.");
                }
            }
        }
        boolean requiresConfirmation = evaluation.path("needsScheduleAdjustment").asBoolean(false)
                && !proposedChanges.scheduleChanges().isEmpty();
        if (!requiresConfirmation && evaluation.path("needsScheduleAdjustment").asBoolean(false)
                && evaluation instanceof ObjectNode object) object.put("needsScheduleAdjustment", false);

        DailyAiReview review = new DailyAiReview();
        review.setUserId(userId);
        review.setRoadmapId(active.getId());
        review.setReviewDate(date);
        review.setStatus(requiresConfirmation ? AWAITING_CONFIRMATION : NO_CHANGE);
        review.setSnapshotJson(write(snapshot));
        review.setReviewJson(write(evaluation));
        review.setProposalJson(requiresConfirmation ? write(proposedChanges) : null);
        review.setDecisionReason(requiresConfirmation ? textOrDefault(evaluation, "recommendation", 500, "Đề xuất điều chỉnh cần người dùng xác nhận.") : "Lịch hiện tại tiếp tục; không áp dụng thay đổi.");
        review.setSource(useGemini ? "GEMINI" : "RULE_FALLBACK");
        return toResponse(reviewRepository.save(review));
    }

    @Transactional
    public DailyAiReviewResponse accept(Long userId, Long reviewId) {
        DailyAiReview review = reviewRepository.findByIdAndUserIdForUpdate(reviewId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đánh giá của tài khoản này."));
        if ("ACCEPTED".equals(review.getStatus())) return toResponse(review);
        if (!AWAITING_CONFIRMATION.equals(review.getStatus())) throw new IllegalArgumentException("Đánh giá này không còn chờ xác nhận.");
        DailyReviewChanges changes = readChanges(review.getProposalJson());
        var roadmap = lifecycleService.applyDailyReviewAdjustment(review.getRoadmapId(), changes);
        review.setStatus("ACCEPTED");
        review.setAppliedRoadmapId(roadmap.id());
        review.setDecidedAt(java.time.Instant.now());
        review.setDecisionReason("Người dùng xác nhận áp dụng thay đổi được đề xuất.");
        return toResponse(reviewRepository.save(review));
    }

    @Transactional
    public DailyAiReviewResponse reject(Long userId, Long reviewId) {
        DailyAiReview review = reviewRepository.findByIdAndUserIdForUpdate(reviewId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy đánh giá của tài khoản này."));
        if ("REJECTED".equals(review.getStatus())) return toResponse(review);
        if (!AWAITING_CONFIRMATION.equals(review.getStatus())) throw new IllegalArgumentException("Đánh giá này không còn chờ xác nhận.");
        review.setStatus("REJECTED");
        review.setDecidedAt(java.time.Instant.now());
        review.setDecisionReason("Người dùng từ chối; lịch hiện tại được giữ nguyên.");
        return toResponse(reviewRepository.save(review));
    }

    @Transactional(readOnly = true)
    public List<DailyAiReviewResponse> history(Long userId, Long roadmapId) {
        if (roadmapId != null && roadmapRepository.findByIdAndUserId(roadmapId, userId).isEmpty()) {
            throw new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này.");
        }
        List<DailyAiReview> reviews = roadmapId == null
                ? reviewRepository.findTop30ByUserIdOrderByReviewDateDescCreatedAtDesc(userId)
                : reviewRepository.findTop30ByUserIdAndRoadmapIdOrderByReviewDateDescCreatedAtDesc(userId, roadmapId);
        return reviews.stream().map(this::toResponse).toList();
    }

    private int dayIndex(RoadmapRecord roadmap, LocalDate date) {
        if (roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null) throw new IllegalStateException("Lộ trình thiếu ngày bắt đầu hoặc thời lượng.");
        int index = Math.toIntExact(ChronoUnit.DAYS.between(roadmap.getStartDate(), date));
        if (index < 0 || index >= roadmap.getDurationWeeks() * 7) throw new IllegalArgumentException("Ngày đánh giá nằm ngoài thời lượng lộ trình.");
        return index;
    }

    private JsonNode snapshot(RoadmapRecord roadmap, UserProfile profile, LocalDate date, int dayIndex,
                              List<RoadmapPlanSlot> slots, List<ActivitySession> activitySessions,
                              List<WorkoutSession> gymSessions, List<MealLog> meals,
                              DailyCheckin checkin, List<RoadmapPlanSlot> futureSlots) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("date", date.toString());
        root.put("dayIndex", dayIndex);
        root.put("roadmapId", roadmap.getId());
        root.put("roadmapTitle", roadmap.getTitle());
        root.put("goal", profile == null ? "" : safe(profile.getGoal()));
        root.put("activityLevel", profile == null ? "" : safe(profile.getActivityLevel()));
        root.put("healthLimits", profile == null ? "" : String.join("; ", safe(profile.getRestrictions()), safe(profile.getPainAreas())));
        root.set("initialWeeklyPlan", readStringArray(roadmap.getWeeklyPlan()));
        ArrayNode planned = root.putArray("plannedActivities");
        slots.forEach(slot -> {
            ObjectNode item = planned.addObject();
            item.put("slotId", slot.getId());
            item.put("period", slot.getSessionPeriod());
            item.put("startTime", slot.getStartTime().toString());
            item.put("endTime", slot.getEndTime().toString());
            item.put("activityType", slot.getActivityType());
            item.put("activity", slot.getActivity());
            item.put("status", normalizeStatus(slot.getStatus()));
            item.put("expectedMinutes", slot.getDurationMinutes());
            item.put("actualMinutes", slot.getActualDurationMinutes() == null ? 0 : slot.getActualDurationMinutes());
        });
        ArrayNode movement = root.putArray("recordedPhysicalActivities");
        activitySessions.forEach(session -> {
            ObjectNode item = movement.addObject();
            item.put("type", session.getActivityType());
            item.put("status", session.getStatus());
            putNullable(item, "durationSeconds", session.getDurationSeconds());
            putNullable(item, "distanceMeters", session.getDistanceMeters());
            putNullable(item, "steps", session.getSteps());
            item.put("distanceSource", session.getDistanceSource());
            item.put("stepsSource", session.getStepsSource());
        });
        ArrayNode gym = root.putArray("recordedGymActivities");
        gymSessions.forEach(session -> {
            ObjectNode item = gym.addObject();
            item.put("exerciseCode", session.getExercise());
            item.put("status", session.getStatus());
            item.put("repetitions", session.getReps());
            item.put("repetitionSource", session.getRepsSource());
            putNullable(item, "durationSeconds", session.getDurationSeconds());
            if (session.getUserRating() != null) item.put("userRating", session.getUserRating());
            item.put("notes", safe(session.getNotes()));
        });
        ArrayNode mealLogs = root.putArray("recordedMeals");
        meals.forEach(meal -> {
            ObjectNode item = mealLogs.addObject();
            item.put("mealType", meal.getMealType());
            item.put("status", meal.getStatus());
            item.put("dishName", safe(meal.getDishName()));
            item.put("plannedMeal", safe(meal.getPlannedMeal()));
            item.put("analysisSource", safe(meal.getRecommendationSource()));
            item.put("hasAnalysis", meal.getAnalysisJson() != null && !meal.getAnalysisJson().isBlank());
            if (meal.getAnalysisJson() != null && !meal.getAnalysisJson().isBlank()) item.set("analysis", readJson(meal.getAnalysisJson()));
        });
        ObjectNode readiness = root.putObject("checkin");
        readiness.put("exists", checkin != null);
        if (checkin != null) {
            putNullable(readiness, "energyLevel", checkin.getEnergyLevel());
            putNullable(readiness, "fatigueLevel", checkin.getFatigueLevel());
            putNullable(readiness, "sleepHours", checkin.getSleepHours());
            readiness.put("mood", safe(checkin.getMood()));
            readiness.put("activityNotes", safe(checkin.getActivityNotes()));
            readiness.put("note", safe(checkin.getNote()));
        }
        ArrayNode nextSchedule = root.putArray("futureUpcomingSlots");
        futureSlots.forEach(slot -> {
            ObjectNode item = nextSchedule.addObject();
            item.put("slotId", slot.getId());
            item.put("dayIndex", slot.getDayIndex());
            item.put("period", slot.getSessionPeriod());
            item.put("startTime", slot.getStartTime().toString());
            item.put("endTime", slot.getEndTime().toString());
            item.put("activityType", slot.getActivityType());
            item.put("activity", slot.getActivity());
        });
        return root;
    }

    private JsonNode generate(JsonNode snapshot, List<RoadmapPlanSlot> futureSlots) {
        if (!geminiClient.isConfigured()) return fallback(snapshot, futureSlots);
        try {
            return objectMapper.readTree(geminiClient.generateJson(prompt(snapshot), schema(futureSlots)));
        } catch (Exception exception) {
            log.warn("Daily AI review used fallback ({})", exception.getClass().getSimpleName());
            return fallback(snapshot, futureSlots);
        }
    }

    private String prompt(JsonNode snapshot) {
        return """
                Bạn là trợ lý đánh giá kế hoạch vận động cuối ngày, trả lời ngắn gọn bằng tiếng Việt.
                Chỉ suy luận từ snapshot thực tế. Không suy luận người dùng đã ăn hoặc tập nếu dữ liệu không có. Không đánh giá thành công dựa chỉ trên cân nặng; cân nặng không có trong snapshot này.
                Hãy nêu mục tiêu đạt được, hoạt động chưa xong, khối lượng có vẻ quá tải/nhẹ/chưa đủ dữ liệu, dữ liệu thiếu và lý do.
                Nếu lịch vẫn phù hợp, shouldAdjust=false và scheduleChanges rỗng.
                Nếu đề xuất điều chỉnh đáng kể: chỉ thay đổi slotId có trong futureUpcomingSlots; không thêm slot mới, không đổi slot đã bắt đầu/kết thúc, không vượt giới hạn healthLimits. MOVE/REPLACE phải giữ cùng activityType nhóm vận động và khung nghỉ hợp lý; CANCEL chỉ khi lý do rõ. Đưa thay đổi ở mức bảo thủ, không tăng tải mạnh sau một ngày tốt.
                AI đề xuất không áp dụng ngay; người dùng sẽ xác nhận.
                Snapshot JSON:
                %s
                """.formatted(AiPromptSanitizer.sanitize(snapshot.toString(), 14000));
    }

    private JsonNode schema(List<RoadmapPlanSlot> futureSlots) {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties");
        properties.putObject("summary").put("type", "STRING");
        arrayOfStrings(properties, "achievedGoals");
        arrayOfStrings(properties, "incompleteActivities");
        arrayOfStrings(properties, "workloadAssessment");
        arrayOfStrings(properties, "missingData");
        properties.putObject("needsScheduleAdjustment").put("type", "BOOLEAN");
        arrayOfStrings(properties, "reasons");
        arrayOfStrings(properties, "suggestions");
        properties.putObject("recommendation").put("type", "STRING");
        ObjectNode changeItems = properties.putObject("scheduleChanges").put("type", "ARRAY").putObject("items");
        changeItems.put("type", "OBJECT");
        ObjectNode changeProperties = changeItems.putObject("properties");
        var allowedIds = changeProperties.putObject("slotId").put("type", "INTEGER").putArray("enum");
        futureSlots.forEach(slot -> allowedIds.add(slot.getId()));
        changeProperties.putObject("action").put("type", "STRING").putArray("enum").add("MOVE").add("REPLACE").add("CANCEL");
        changeProperties.putObject("dayIndex").put("type", "INTEGER");
        changeProperties.putObject("sessionPeriod").put("type", "STRING").putArray("enum").add("MORNING").add("AFTERNOON").add("EVENING");
        changeProperties.putObject("startTime").put("type", "STRING");
        changeProperties.putObject("endTime").put("type", "STRING");
        changeProperties.putObject("activityType").put("type", "STRING").putArray("enum").add("RUNNING").add("GYM").add("WALKING").add("STRENGTH").add("MOBILITY").add("OTHER");
        changeProperties.putObject("activity").put("type", "STRING");
        changeProperties.putObject("reason").put("type", "STRING");
        if (futureSlots.isEmpty()) {
            ObjectNode slotId = changeProperties.putObject("slotId");
            slotId.put("type", "INTEGER");
        }
        changeItems.putArray("required").add("slotId").add("action").add("dayIndex").add("sessionPeriod").add("startTime").add("endTime").add("activityType").add("activity").add("reason");
        schema.putArray("required").add("summary").add("achievedGoals").add("incompleteActivities").add("workloadAssessment")
                .add("missingData").add("needsScheduleAdjustment").add("reasons").add("suggestions").add("recommendation").add("scheduleChanges");
        return schema;
    }

    private JsonNode fallback(JsonNode snapshot, List<RoadmapPlanSlot> futureSlots) {
        ObjectNode result = objectMapper.createObjectNode();
        result.put("summary", "Đánh giá dựa trên dữ liệu đã ghi nhận trong ngày; kết quả không phải đánh giá y khoa.");
        ArrayNode achieved = result.putArray("achievedGoals");
        ArrayNode incomplete = result.putArray("incompleteActivities");
        JsonNode planned = snapshot.path("plannedActivities");
        if (planned.isArray()) planned.forEach(item -> {
            String status = item.path("status").asText("");
            String activity = item.path("activity").asText("");
            if ("COMPLETED".equals(status)) achieved.add("Hoàn thành: " + activity);
            else if ("UPCOMING".equals(status) || "SKIPPED".equals(status) || "CANCELLED".equals(status)) incomplete.add(activity + " (" + status + ")");
        });
        ArrayNode workload = result.putArray("workloadAssessment");
        workload.add("Chỉ tổng hợp slot, thời lượng và hoạt động đã được ghi nhận; chưa tự kết luận quá tải nếu thiếu check-in.");
        ArrayNode missing = result.putArray("missingData");
        if (!snapshot.path("checkin").path("exists").asBoolean(false)) missing.add("Chưa có check-in hôm nay về năng lượng, mệt mỏi hoặc giấc ngủ.");
        if (snapshot.path("recordedMeals").isEmpty()) missing.add("Chưa có bữa ăn nào được ghi nhận hôm nay.");
        result.put("needsScheduleAdjustment", false);
        result.putArray("reasons");
        result.putArray("suggestions").add("Tiếp tục theo lịch hiện tại; duy trì nghỉ và phục hồi.");
        result.put("recommendation", "Lịch hiện tại được giữ nguyên vì chưa có đủ cơ sở cho thay đổi.");
        result.putArray("scheduleChanges");
        return result;
    }

    private DailyReviewChanges parseAndValidateChanges(JsonNode node, RoadmapRecord roadmap, LocalDate reviewDate,
                                                       List<RoadmapPlanSlot> futureSlots) {
        List<DailyScheduleChange> changes = new ArrayList<>();
        if (!node.isArray()) return new DailyReviewChanges(roadmap.getId(), roadmap.getVersionNumber(), changes);
        Set<Long> allowed = futureSlots.stream().map(RoadmapPlanSlot::getId).collect(java.util.stream.Collectors.toSet());
        Set<Long> seen = new HashSet<>();
        int todayIndex = Math.toIntExact(ChronoUnit.DAYS.between(roadmap.getStartDate(), reviewDate));
        node.forEach(item -> {
            if (changes.size() >= 10) return;
            long slotId = item.path("slotId").asLong(-1);
            String action = item.path("action").asText("");
            int dayIndex = item.path("dayIndex").asInt(-1);
            String period = item.path("sessionPeriod").asText("");
            String type = item.path("activityType").asText("");
            String activity = item.path("activity").asText("");
            String reason = item.path("reason").asText("");
            if (!allowed.contains(slotId) || !seen.add(slotId) || !Set.of("MOVE", "REPLACE", "CANCEL").contains(action)
                    || dayIndex <= todayIndex || dayIndex >= roadmap.getDurationWeeks() * 7
                    || !Set.of("MORNING", "AFTERNOON", "EVENING").contains(period)
                    || !Set.of("RUNNING", "GYM", "WALKING", "STRENGTH", "MOBILITY", "OTHER").contains(type)
                    || activity.isBlank() || activity.length() > 100 || reason.isBlank() || reason.length() > 240) return;
            try {
                java.time.LocalTime start = java.time.LocalTime.parse(item.path("startTime").asText());
                java.time.LocalTime end = java.time.LocalTime.parse(item.path("endTime").asText());
                long duration = java.time.Duration.between(start, end).toMinutes();
                if (duration < 15 || duration > 240 || !withinPeriod(period, start, end)) return;
                changes.add(new DailyScheduleChange(slotId, action, dayIndex, period, start, end, type, activity, reason));
            } catch (RuntimeException ignored) { }
        });
        validateNoOverlaps(roadmap, changes, futureSlots);
        return new DailyReviewChanges(roadmap.getId(), roadmap.getVersionNumber(), changes);
    }

    private void validateNoOverlaps(RoadmapRecord roadmap, List<DailyScheduleChange> changes, List<RoadmapPlanSlot> futureSlots) {
        Set<Long> changedIds = changes.stream().map(DailyScheduleChange::slotId).collect(java.util.stream.Collectors.toSet());
        List<DailyScheduleChange> projected = new ArrayList<>(changes.stream().filter(change -> !"CANCEL".equals(change.action())).toList());
        futureSlots.stream().filter(slot -> !changedIds.contains(slot.getId())).forEach(slot -> projected.add(
                new DailyScheduleChange(slot.getId(), "MOVE", slot.getDayIndex(), slot.getSessionPeriod(), slot.getStartTime(),
                        slot.getEndTime(), slot.getActivityType(), slot.getActivity(), "Giữ lịch hiện tại.")));
        java.util.Map<Integer, List<DailyScheduleChange>> byDay = new java.util.HashMap<>();
        projected.forEach(change -> byDay.computeIfAbsent(change.dayIndex(), ignored -> new ArrayList<>()).add(change));
        byDay.forEach((day, entries) -> {
            entries.sort(java.util.Comparator.comparing(DailyScheduleChange::startTime));
            for (int index = 1; index < entries.size(); index++) {
                if (entries.get(index).startTime().isBefore(entries.get(index - 1).endTime())) {
                    throw new IllegalArgumentException("Đề xuất AI có khung giờ trùng nhau trong ngày " + (day + 1) + ". Hãy đánh giá lại.");
                }
            }
        });
    }

    private boolean withinPeriod(String period, java.time.LocalTime start, java.time.LocalTime end) {
        java.time.LocalTime noon = java.time.LocalTime.NOON;
        java.time.LocalTime evening = java.time.LocalTime.of(18, 0);
        return switch (period) {
            case "MORNING" -> start.isBefore(noon) && !end.isAfter(noon);
            case "AFTERNOON" -> !start.isBefore(noon) && !start.isAfter(evening) && end.isAfter(noon) && !end.isAfter(evening);
            case "EVENING" -> !start.isBefore(evening) && end.isAfter(evening);
            default -> false;
        };
    }

    private void arrayOfStrings(ObjectNode properties, String name) {
        properties.putObject(name).put("type", "ARRAY").putObject("items").put("type", "STRING");
    }

    private DailyAiReviewResponse toResponse(DailyAiReview review) {
        JsonNode result = readJson(review.getReviewJson());
        DailyReviewChanges changes = review.getProposalJson() == null ? null : readChanges(review.getProposalJson());
        return new DailyAiReviewResponse(review.getId(), review.getReviewDate(), review.getRoadmapId(), review.getStatus(),
                text(result, "summary"), readStrings(result.path("achievedGoals")), readStrings(result.path("incompleteActivities")),
                readStrings(result.path("workloadAssessment")), readStrings(result.path("missingData")),
                result.path("needsScheduleAdjustment").asBoolean(false), readStrings(result.path("reasons")),
                readStrings(result.path("suggestions")), text(result, "recommendation"), changes,
                AWAITING_CONFIRMATION.equals(review.getStatus()), review.getSource(), review.getCreatedAt(), review.getDecidedAt(), review.getAppliedRoadmapId());
    }

    private JsonNode readJson(String value) {
        try { return objectMapper.readTree(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Đánh giá ngày đã lưu không hợp lệ.", exception); }
    }

    private DailyReviewChanges readChanges(String value) {
        try { return objectMapper.readValue(value, DailyReviewChanges.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Đề xuất lịch đã lưu không hợp lệ.", exception); }
    }

    private List<String> readStrings(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node.isArray()) node.forEach(value -> { if (value.isTextual()) values.add(value.asText()); });
        return values;
    }

    private String text(JsonNode node, String field) { return node.path(field).asText(""); }
    private String textOrDefault(JsonNode node, String field, int max, String fallback) {
        String value = text(node, field).trim();
        return value.isBlank() ? fallback : value.substring(0, Math.min(value.length(), max));
    }
    private String write(JsonNode node) {
        try { return objectMapper.writeValueAsString(node); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Không thể lưu snapshot đánh giá.", exception); }
    }
    private String write(DailyReviewChanges changes) {
        try { return objectMapper.writeValueAsString(changes); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Không thể lưu đề xuất điều chỉnh.", exception); }
    }
    private JsonNode readStringArray(String json) {
        if (json == null || json.isBlank()) return objectMapper.createArrayNode();
        try { return objectMapper.readTree(json); }
        catch (JsonProcessingException ignored) { return objectMapper.createArrayNode(); }
    }
    private void putNullable(ObjectNode node, String key, Number value) {
        if (value == null) return;
        if (value instanceof Integer || value instanceof Long) node.put(key, value.longValue());
        else node.put(key, value.doubleValue());
    }
    private String safe(String value) { return value == null ? "" : value; }
    private String normalizeStatus(String value) { return "PLANNED".equals(value) ? "UPCOMING" : value; }
}
