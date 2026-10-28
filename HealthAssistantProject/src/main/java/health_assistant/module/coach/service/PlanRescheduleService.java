package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.ai.service.AiPromptSanitizer;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.dto.DailyReviewChanges;
import health_assistant.module.coach.dto.DailyScheduleChange;
import health_assistant.module.coach.dto.PlanReschedulePreviewResponse;
import health_assistant.module.coach.dto.PlanRescheduleRequest;
import health_assistant.module.coach.entity.PlanReschedulePreview;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.PlanReschedulePreviewRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.entity.ActivitySession;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlanRescheduleService {
    public static final String PREMIUM_FEATURE = "AI_PLAN_RESCHEDULE";
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int FREE_PREVIEW_DAYS = 7;
    private static final int FREE_DAILY_PREVIEWS = 1;
    private static final int FREE_CHANGES = 1;
    private static final int PREMIUM_CHANGES = 30;
    private static final List<String> UPCOMING_STATES = List.of("UPCOMING", "PLANNED");
    private static final Set<String> SCOPES = Set.of("SINGLE_SLOT", "DAY", "REMAINING_DAYS", "NEW_VERSION");
    private static final Set<String> ACTIONS = Set.of("MOVE", "REPLACE", "CANCEL");
    private static final Set<String> PERIODS = Set.of("MORNING", "AFTERNOON", "EVENING");
    private static final Set<String> ACTIVITIES = Set.of("RUNNING", "GYM", "WALKING", "STRENGTH", "MOBILITY", "OTHER");

    private final PlanReschedulePreviewRepository previewRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ActivitySessionRepository activityRepository;
    private final UserProfileRepository profileRepository;
    private final FeatureAccessService featureAccessService;
    private final RoadmapLifecycleService lifecycleService;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public PlanReschedulePreviewResponse preview(Long userId, PlanRescheduleRequest request) {
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi điều chỉnh lịch."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước khi đề xuất lịch bằng AI.");
        RoadmapRecord roadmap = roadmapRepository.findByIdAndUserIdForUpdate(request.roadmapId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (!"ACTIVE".equals(roadmap.getStatus())) throw new IllegalArgumentException("Chỉ có thể điều chỉnh lộ trình đang hoạt động.");
        validateRoadmap(roadmap);
        boolean premium = featureAccessService.hasFeature(userId, PREMIUM_FEATURE);
        validateRequest(userId, request, roadmap, premium, true);
        if (!geminiClient.isConfigured()) throw new IllegalStateException("AI đề xuất điều chỉnh lịch chưa được cấu hình.");

        List<RoadmapPlanSlot> eligible = eligibleSlots(roadmap, request);
        if (eligible.isEmpty()) throw new IllegalArgumentException("Không có slot UPCOMING phù hợp trong phạm vi đã chọn.");
        List<RoadmapPlanSlot> allUpcoming = allUpcoming(roadmap);
        JsonNode snapshot = snapshot(userId, roadmap, profile, request, eligible);
        JsonNode ai = generate(snapshot, eligible, premium);
        List<DailyScheduleChange> changes = parseChanges(ai.path("scheduleChanges"), roadmap, request, eligible, allUpcoming, premium);
        if (changes.isEmpty()) throw new IllegalArgumentException("AI chưa tạo được thay đổi lịch hợp lệ; lịch hiện tại chưa đổi.");
        String summary = requiredText(ai, "summary", 900);
        List<String> differences = textList(ai.path("differences"), 12, 300);
        if (differences.isEmpty()) differences = changes.stream().map(this::differenceLine).toList();

        ObjectNode proposal = objectMapper.createObjectNode();
        proposal.put("summary", summary);
        proposal.set("differences", objectMapper.valueToTree(differences));
        proposal.set("changes", objectMapper.valueToTree(changes));
        proposal.set("safetyNotes", objectMapper.valueToTree(List.of(
                "Bản xem trước chưa áp dụng.",
                "Slot đã bắt đầu, hoàn thành, bỏ qua hoặc hủy không bị ghi đè.")));

        PlanReschedulePreview preview = new PlanReschedulePreview();
        preview.setPreviewId(UUID.randomUUID().toString());
        preview.setUserId(userId);
        preview.setRoadmapId(roadmap.getId());
        preview.setBaseVersionNumber(roadmap.getVersionNumber());
        preview.setScope(request.scope());
        preview.setTargetDate(request.targetDate());
        preview.setStatus("PENDING");
        preview.setRequestJson(write(request));
        preview.setSnapshotJson(write(snapshot));
        preview.setProposalJson(write(proposal));
        preview.setProposalSummary(summary);
        preview.setProposalDifferences(write(differences));
        preview.setSafetyNotes(write(List.of("Chỉ áp dụng sau khi bạn xác nhận.", "Các hoạt động không đổi được giữ nguyên.")));
        preview.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
        return toResponse(previewRepository.save(preview), premium);
    }

    @Transactional
    public PlanReschedulePreviewResponse confirm(Long userId, String previewId) {
        PlanReschedulePreview preview = previewRepository.findForUpdate(previewId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy bản xem trước của tài khoản này."));
        boolean premium = featureAccessService.hasFeature(userId, PREMIUM_FEATURE);
        if ("ACCEPTED".equals(preview.getStatus())) return toResponse(preview, premium);
        if (!"PENDING".equals(preview.getStatus())) throw new IllegalArgumentException("Bản xem trước đã được xử lý.");
        if (!preview.getExpiresAt().isAfter(Instant.now())) {
            preview.setStatus("EXPIRED");
            preview.setDecidedAt(Instant.now());
            return toResponse(previewRepository.save(preview), premium);
        }
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần có sự đồng ý hồ sơ khi áp dụng lịch mới.");
        RoadmapRecord active = roadmapRepository.findByIdAndUserIdForUpdate(preview.getRoadmapId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (!"ACTIVE".equals(active.getStatus()) || !sameVersion(active.getVersionNumber(), preview.getBaseVersionNumber())) {
            throw new IllegalArgumentException("Lộ trình đã đổi phiên bản. Hãy tạo lại bản xem trước.");
        }
        PlanRescheduleRequest originalRequest = readRequest(preview.getRequestJson());
        validateRequest(userId, originalRequest, active, premium, false);
        if (!premium) consumeFreeAcceptedQuota(userId);
        List<RoadmapPlanSlot> eligible = eligibleSlots(active, originalRequest);
        List<RoadmapPlanSlot> allUpcoming = allUpcoming(active);
        List<DailyScheduleChange> changes = readChanges(preview.getProposalJson());
        changes = parseChanges(objectMapper.valueToTree(changes), active, originalRequest, eligible, allUpcoming, premium);
        var version = lifecycleService.applyRescheduleAdjustment(active.getId(),
                new DailyReviewChanges(active.getId(), active.getVersionNumber(), changes));
        preview.setStatus("ACCEPTED");
        preview.setAppliedRoadmapId(version.id());
        preview.setDecidedAt(Instant.now());
        return toResponse(previewRepository.save(preview), premium);
    }

    @Transactional
    public PlanReschedulePreviewResponse reject(Long userId, String previewId) {
        PlanReschedulePreview preview = previewRepository.findForUpdate(previewId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy bản xem trước của tài khoản này."));
        if ("REJECTED".equals(preview.getStatus())) return toResponse(preview, featureAccessService.hasFeature(userId, PREMIUM_FEATURE));
        if (!"PENDING".equals(preview.getStatus())) throw new IllegalArgumentException("Bản xem trước đã được xử lý.");
        preview.setStatus("REJECTED");
        preview.setDecidedAt(Instant.now());
        return toResponse(previewRepository.save(preview), featureAccessService.hasFeature(userId, PREMIUM_FEATURE));
    }

    @Transactional(readOnly = true)
    public List<PlanReschedulePreviewResponse> history(Long userId, Long roadmapId) {
        boolean premium = featureAccessService.hasFeature(userId, PREMIUM_FEATURE);
        return previewRepository.findTop30ByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(item -> roadmapId == null || item.getRoadmapId().equals(roadmapId))
                .map(item -> toResponse(item, premium)).toList();
    }

    private void validateRequest(Long userId, PlanRescheduleRequest request, RoadmapRecord roadmap,
                                 boolean premium, boolean consumePreviewQuota) {
        if (request.scope() == null || !SCOPES.contains(request.scope())) throw new IllegalArgumentException("Phạm vi thay đổi không hợp lệ.");
        if (request.targetDate() == null || roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null) throw new IllegalArgumentException("Ngày hoặc thời lượng lộ trình không hợp lệ.");
        long offset = ChronoUnit.DAYS.between(roadmap.getStartDate(), request.targetDate());
        if (offset < 0 || offset >= roadmap.getDurationWeeks() * 7) throw new IllegalArgumentException("Ngày mục tiêu nằm ngoài thời lượng lộ trình.");
        if (request.targetDate().isBefore(LocalDate.now(USER_ZONE))) throw new IllegalArgumentException("Không thể reschedule một ngày đã qua.");
        if ("SINGLE_SLOT".equals(request.scope()) && request.targetSlotId() == null) throw new IllegalArgumentException("Chọn một khung giờ cụ thể trước khi đổi lịch.");
        if (!"SINGLE_SLOT".equals(request.scope()) && request.targetSlotId() != null) throw new IllegalArgumentException("Chỉ phạm vi một khung giờ mới nhận slotId.");
        validateNaturalFields(request);
        if (!premium) {
            if ("NEW_VERSION".equals(request.scope())) throw new AccessDeniedException("Tạo phiên bản lộ trình theo yêu cầu là quyền Premium.");
            validateFreeHorizon(roadmap, request.targetDate());
            if (consumePreviewQuota) consumeFreePreviewQuota(userId);
        }
    }

    private void validateNaturalFields(PlanRescheduleRequest request) {
        requireLength(request.goal(), 120, "Mục tiêu");
        requireLength(request.naturalLanguageRequest(), 1200, "Yêu cầu tự nhiên");
        requireLength(request.preferredTimeWindows(), 500, "Khung giờ mong muốn");
        requireLength(request.desiredActivityTypes(), 500, "Loại hoạt động");
        requireLength(request.unavailableActivities(), 300, "Hoạt động không thể thực hiện");
        requireLength(request.equipmentOrLocation(), 300, "Thiết bị/địa điểm");
        requireLength(request.healthLimits(), 500, "Giới hạn sức khỏe");
        requireLength(request.reason(), 300, "Lý do thay đổi");
        if (request.reason() == null || request.reason().isBlank()) throw new IllegalArgumentException("Hãy nêu lý do đổi lịch.");
        if (request.availableWeekdays() != null && request.availableWeekdays().stream().anyMatch(day -> day == null || day < 1 || day > 7)) {
            throw new IllegalArgumentException("Ngày rảnh phải nằm trong khoảng thứ 1 đến thứ 7.");
        }
        if ((request.preferredStartTime() == null) != (request.preferredEndTime() == null)) throw new IllegalArgumentException("Nhập cả giờ bắt đầu và kết thúc mong muốn.");
        if (request.preferredStartTime() != null && !request.preferredEndTime().isAfter(request.preferredStartTime())) throw new IllegalArgumentException("Giờ kết thúc mong muốn phải sau giờ bắt đầu.");
    }

    private void requireLength(String value, int max, String label) {
        if (value != null && value.length() > max) throw new IllegalArgumentException(label + " vượt quá " + max + " ký tự.");
    }

    private void validateRoadmap(RoadmapRecord roadmap) {
        if (roadmap.getStartDate() == null || roadmap.getDurationWeeks() == null || roadmap.getDurationWeeks() < 1) throw new IllegalStateException("Lộ trình chưa có khoảng thời gian hợp lệ.");
    }

    private void validateFreeHorizon(RoadmapRecord roadmap, LocalDate targetDate) {
        LocalDate today = LocalDate.now(USER_ZONE);
        if (targetDate.isBefore(today) || targetDate.isAfter(today.plusDays(FREE_PREVIEW_DAYS - 1))) throw new AccessDeniedException("Gói miễn phí chỉ được xem trước lịch trong 7 ngày tính từ hôm nay.");
        LocalDate last = roadmap.getStartDate().plusDays(roadmap.getDurationWeeks() * 7L - 1);
        if (targetDate.isAfter(last)) throw new IllegalArgumentException("Ngày yêu cầu nằm ngoài lộ trình hiện tại.");
    }

    private void consumeFreePreviewQuota(Long userId) {
        LocalDate today = LocalDate.now(USER_ZONE);
        long count = previewRepository.countByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(userId,
                today.atStartOfDay(USER_ZONE).toInstant(), today.plusDays(1).atStartOfDay(USER_ZONE).toInstant());
        if (count >= FREE_DAILY_PREVIEWS) throw new AccessDeniedException("Gói miễn phí đã dùng một bản xem trước AI trong hôm nay.");
    }

    private void consumeFreeAcceptedQuota(Long userId) {
        LocalDate today = LocalDate.now(USER_ZONE);
        long count = previewRepository.countByUserIdAndStatusAndDecidedAtGreaterThanEqualAndDecidedAtLessThan(userId, "ACCEPTED",
                today.atStartOfDay(USER_ZONE).toInstant(), today.plusDays(1).atStartOfDay(USER_ZONE).toInstant());
        if (count >= FREE_DAILY_PREVIEWS) throw new AccessDeniedException("Gói miễn phí đã dùng giới hạn một lần cập nhật lịch hôm nay.");
    }

    private List<RoadmapPlanSlot> eligibleSlots(RoadmapRecord roadmap, PlanRescheduleRequest request) {
        int target = Math.toIntExact(ChronoUnit.DAYS.between(roadmap.getStartDate(), request.targetDate()));
        return slotRepository.findAllByRoadmap_IdAndStatusIn(roadmap.getId(), UPCOMING_STATES).stream()
                .filter(slot -> "UPCOMING".equals(normalize(slot.getStatus())))
                .filter(slot -> switch (request.scope()) {
                    case "SINGLE_SLOT" -> slot.getDayIndex() == target && slot.getId().equals(request.targetSlotId());
                    case "REMAINING_DAYS", "NEW_VERSION" -> slot.getDayIndex() >= target;
                    case "DAY" -> slot.getDayIndex() == target;
                    default -> false;
                }).toList();
    }

    private List<RoadmapPlanSlot> allUpcoming(RoadmapRecord roadmap) {
        return slotRepository.findAllByRoadmap_IdAndStatusIn(roadmap.getId(), UPCOMING_STATES).stream()
                .filter(slot -> "UPCOMING".equals(normalize(slot.getStatus()))).toList();
    }

    private JsonNode snapshot(Long userId, RoadmapRecord roadmap, UserProfile profile,
                              PlanRescheduleRequest request, List<RoadmapPlanSlot> eligible) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("roadmapId", roadmap.getId()); root.put("baseVersion", roadmap.getVersionNumber());
        root.put("title", roadmap.getTitle()); root.put("overview", safe(roadmap.getOverview()));
        root.set("weeklyPlan", readJson(roadmap.getWeeklyPlan()));
        root.put("goal", blank(request.goal()) ? safe(profile.getGoal()) : request.goal());
        root.put("activityLevel", safe(profile.getActivityLevel()));
        root.put("healthLimits", String.join("; ", safe(profile.getRestrictions()), safe(profile.getPainAreas()), safe(request.healthLimits())));
        root.put("targetDate", request.targetDate().toString()); root.put("scope", request.scope());
        root.put("naturalLanguageRequest", safe(request.naturalLanguageRequest())); root.put("reason", request.reason());
        root.set("availableWeekdays", request.availableWeekdays() == null ? objectMapper.createArrayNode() : objectMapper.valueToTree(request.availableWeekdays()));
        root.put("preferredStartTime", request.preferredStartTime() == null ? "" : request.preferredStartTime().toString());
        root.put("preferredEndTime", request.preferredEndTime() == null ? "" : request.preferredEndTime().toString());
        root.put("preferredTimeWindows", safe(request.preferredTimeWindows())); root.put("desiredActivityTypes", safe(request.desiredActivityTypes()));
        if (request.durationMinutes() == null) root.putNull("durationMinutes"); else root.put("durationMinutes", request.durationMinutes());
        root.put("unavailableActivities", safe(request.unavailableActivities())); root.put("equipmentOrLocation", safe(request.equipmentOrLocation()));
        ArrayNode slots = root.putArray("eligibleUpcomingSlots");
        eligible.forEach(slot -> {
            ObjectNode item = slots.addObject(); item.put("slotId", slot.getId()); item.put("dayIndex", slot.getDayIndex());
            item.put("period", slot.getSessionPeriod()); item.put("startTime", slot.getStartTime().toString());
            item.put("endTime", slot.getEndTime().toString()); item.put("activityType", slot.getActivityType());
            item.put("activity", slot.getActivity()); item.put("durationMinutes", slot.getDurationMinutes());
        });
        ArrayNode history = root.putArray("recentRecordedActivity");
        recentActivity(userId, roadmap, request.targetDate()).stream().limit(20).forEach(session -> {
            ObjectNode item = history.addObject(); item.put("type", session.getActivityType()); item.put("status", session.getStatus());
            if (session.getDurationSeconds() != null) item.put("durationSeconds", session.getDurationSeconds());
            if (session.getDistanceMeters() != null) item.put("distanceMeters", session.getDistanceMeters());
            if (session.getSteps() != null) item.put("steps", session.getSteps());
            item.put("source", session.getDistanceSource());
        });
        return root;
    }

    private List<ActivitySession> recentActivity(Long userId, RoadmapRecord roadmap, LocalDate targetDate) {
        Instant from = targetDate.minusDays(14).atStartOfDay(USER_ZONE).toInstant();
        Instant to = targetDate.plusDays(1).atStartOfDay(USER_ZONE).toInstant();
        return activityRepository.findAllByRoadmapIdAndUserIdOrderByStartedAtDesc(roadmap.getId(), userId).stream()
                .filter(item -> item.getStartedAt() != null && !item.getStartedAt().isBefore(from) && item.getStartedAt().isBefore(to)).toList();
    }

    private JsonNode generate(JsonNode snapshot, List<RoadmapPlanSlot> eligible, boolean premium) {
        try { return objectMapper.readTree(geminiClient.generateJson(prompt(snapshot, premium), schema(eligible))); }
        catch (Exception exception) {
            log.warn("Plan reschedule AI preview failed ({})", exception.getClass().getSimpleName());
            throw new IllegalStateException("AI chưa tạo được bản xem trước hợp lệ. Lịch hiện tại chưa thay đổi.");
        }
    }

    private String prompt(JsonNode snapshot, boolean premium) {
        return """
                Bạn là trợ lý AI điều chỉnh kế hoạch vận động. Trả JSON theo schema, bằng tiếng Việt. Bạn không có quyền ghi database.
                Đọc lịch hiện tại và lịch sử cần thiết; giữ nguyên mọi hoạt động không yêu cầu thay đổi. Chỉ sửa slotId trong eligibleUpcomingSlots; không tạo slot mới và không đổi slot đã bắt đầu/kết thúc.
                Tuân thủ mục tiêu, ngày rảnh, khung giờ, loại hoạt động, thời lượng, thiết bị/địa điểm, hoạt động không thể làm, lý do và giới hạn sức khỏe.
                Kiểm tra khung giờ không trùng và thời gian phục hồi; không tăng khối lượng quá mức. Nếu yêu cầu không khả thi/thiếu dữ liệu, trả scheduleChanges rỗng và giải thích trong summary.
                Bản kết quả chỉ là preview cần người dùng xác nhận. Giới hạn thay đổi tối đa: %d slot.
                Input:
                %s
                """.formatted(premium ? PREMIUM_CHANGES : FREE_CHANGES, AiPromptSanitizer.sanitize(snapshot.toString(), 14000));
    }

    private JsonNode schema(List<RoadmapPlanSlot> eligible) {
        ObjectNode schema = objectMapper.createObjectNode(); schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties"); properties.putObject("summary").put("type", "STRING");
        arrayStrings(properties, "differences");
        ObjectNode item = properties.putObject("scheduleChanges").put("type", "ARRAY").putObject("items"); item.put("type", "OBJECT");
        ObjectNode fields = item.putObject("properties"); ArrayNode ids = fields.putObject("slotId").put("type", "INTEGER").putArray("enum");
        eligible.forEach(slot -> ids.add(slot.getId()));
        if (eligible.isEmpty()) fields.putObject("slotId").put("type", "INTEGER");
        fields.putObject("action").put("type", "STRING").putArray("enum").add("MOVE").add("REPLACE").add("CANCEL");
        fields.putObject("dayIndex").put("type", "INTEGER");
        fields.putObject("sessionPeriod").put("type", "STRING").putArray("enum").add("MORNING").add("AFTERNOON").add("EVENING");
        fields.putObject("startTime").put("type", "STRING"); fields.putObject("endTime").put("type", "STRING");
        fields.putObject("activityType").put("type", "STRING").putArray("enum").add("RUNNING").add("GYM").add("WALKING").add("STRENGTH").add("MOBILITY").add("OTHER");
        fields.putObject("activity").put("type", "STRING"); fields.putObject("reason").put("type", "STRING");
        item.putArray("required").add("slotId").add("action").add("dayIndex").add("sessionPeriod").add("startTime").add("endTime").add("activityType").add("activity").add("reason");
        schema.putArray("required").add("summary").add("differences").add("scheduleChanges");
        return schema;
    }

    private List<DailyScheduleChange> parseChanges(JsonNode node, RoadmapRecord roadmap, PlanRescheduleRequest request,
                                                   List<RoadmapPlanSlot> eligible, List<RoadmapPlanSlot> allUpcoming, boolean premium) {
        if (!node.isArray()) throw new IllegalArgumentException("AI response thiếu lịch có cấu trúc.");
        int max = premium ? PREMIUM_CHANGES : FREE_CHANGES;
        if (node.isEmpty() || node.size() > max) throw new IllegalArgumentException("Số thay đổi vượt giới hạn hoặc AI chưa đề xuất được lịch.");
        Map<Long, RoadmapPlanSlot> allowed = new HashMap<>(); eligible.forEach(slot -> allowed.put(slot.getId(), slot));
        Set<Long> seen = new HashSet<>();
        int target = Math.toIntExact(ChronoUnit.DAYS.between(roadmap.getStartDate(), request.targetDate()));
        List<DailyScheduleChange> changes = new ArrayList<>();
        node.forEach(item -> {
            long id = item.path("slotId").asLong(-1);
            String action = item.path("action").asText("");
            int day = item.path("dayIndex").asInt(-1);
            String period = item.path("sessionPeriod").asText("");
            String type = item.path("activityType").asText("");
            String activity = item.path("activity").asText("").trim();
            String reason = item.path("reason").asText("").trim();
            RoadmapPlanSlot original = allowed.get(id);
            if (original == null || !seen.add(id)) throw new IllegalArgumentException("AI tham chiếu slot ngoài phạm vi preview.");
            if (!ACTIONS.contains(action) || day < target || day >= roadmap.getDurationWeeks() * 7) throw new IllegalArgumentException("AI đề xuất ngày hoặc hành động ngoài phạm vi.");
            if (!premium) {
                LocalDate candidateDate = roadmap.getStartDate().plusDays(day);
                LocalDate today = LocalDate.now(USER_ZONE);
                if (candidateDate.isBefore(today) || candidateDate.isAfter(today.plusDays(FREE_PREVIEW_DAYS - 1))) throw new AccessDeniedException("Gói miễn phí chỉ thay đổi slot trong 7 ngày tới.");
            }
            if ("SINGLE_SLOT".equals(request.scope()) && node.size() != 1) throw new IllegalArgumentException("Scope một slot chỉ cho phép thay đổi một khung.");
            if ("SINGLE_SLOT".equals(request.scope()) && day != target) throw new IllegalArgumentException("Scope một khung giờ chỉ thay đổi trong ngày mục tiêu.");
            if ("DAY".equals(request.scope()) && day != target) throw new IllegalArgumentException("Đề xuất vượt ngoài ngày được chọn.");
            if (request.availableWeekdays() != null && !request.availableWeekdays().isEmpty()) {
                int weekday = roadmap.getStartDate().plusDays(day).getDayOfWeek().getValue();
                if (!request.availableWeekdays().contains(weekday)) throw new IllegalArgumentException("Đề xuất sử dụng ngày không nằm trong các ngày rảnh bạn chọn.");
            }
            if ("CANCEL".equals(action)) {
                changes.add(new DailyScheduleChange(id, action, original.getDayIndex(), original.getSessionPeriod(), original.getStartTime(),
                        original.getEndTime(), original.getActivityType(), original.getActivity(), reason.isBlank() ? "Người dùng yêu cầu bỏ hoạt động." : reason));
                return;
            }
            if (!PERIODS.contains(period) || !ACTIVITIES.contains(type) || activity.isBlank() || activity.length() > 100 || reason.isBlank() || reason.length() > 240) throw new IllegalArgumentException("Trường lịch AI không hợp lệ.");
            try {
                LocalTime start = LocalTime.parse(item.path("startTime").asText());
                LocalTime end = LocalTime.parse(item.path("endTime").asText());
                long minutes = Duration.between(start, end).toMinutes();
                if (minutes < 15 || minutes > 240 || !withinPeriod(period, start, end)) throw new IllegalArgumentException("Giờ hoặc thời lượng đề xuất không hợp lệ.");
                if (request.durationMinutes() != null && minutes != request.durationMinutes()) throw new IllegalArgumentException("Thời lượng đề xuất khác thời lượng bạn yêu cầu.");
                if (request.preferredStartTime() != null && (!request.preferredStartTime().equals(start) || !request.preferredEndTime().equals(end))) {
                    throw new IllegalArgumentException("Khung giờ đề xuất khác khung giờ bạn chọn.");
                }
                if (!blank(request.desiredActivityTypes())) {
                    Set<String> desired = java.util.Arrays.stream(request.desiredActivityTypes().split(","))
                            .map(String::trim).filter(value -> !value.isBlank()).map(String::toUpperCase).collect(java.util.stream.Collectors.toSet());
                    if (!desired.isEmpty() && !desired.contains(type)) throw new IllegalArgumentException("Loại hoạt động đề xuất không nằm trong loại bạn chọn.");
                }
                changes.add(new DailyScheduleChange(id, action, day, period, start, end, type, activity, reason));
            } catch (java.time.format.DateTimeParseException exception) { throw new IllegalArgumentException("AI trả giờ không đúng định dạng HH:mm."); }
        });
        validateNoOverlap(changes, allUpcoming);
        return changes;
    }

    private void validateNoOverlap(List<DailyScheduleChange> changes, List<RoadmapPlanSlot> eligible) {
        Set<Long> changed = changes.stream().map(DailyScheduleChange::slotId).collect(java.util.stream.Collectors.toSet());
        List<DailyScheduleChange> projected = new ArrayList<>(changes.stream().filter(change -> !"CANCEL".equals(change.action())).toList());
        eligible.stream().filter(slot -> !changed.contains(slot.getId())).forEach(slot -> projected.add(new DailyScheduleChange(
                slot.getId(), "MOVE", slot.getDayIndex(), slot.getSessionPeriod(), slot.getStartTime(), slot.getEndTime(), slot.getActivityType(), slot.getActivity(), "Giữ nguyên.")));
        Map<Integer, List<DailyScheduleChange>> byDay = new HashMap<>(); projected.forEach(item -> byDay.computeIfAbsent(item.dayIndex(), ignored -> new ArrayList<>()).add(item));
        byDay.forEach((day, values) -> {
            values.sort(Comparator.comparing(DailyScheduleChange::startTime));
            for (int index = 1; index < values.size(); index++) if (values.get(index).startTime().isBefore(values.get(index - 1).endTime())) throw new IllegalArgumentException("Đề xuất có giờ tập trùng trong ngày " + (day + 1) + ".");
        });
    }

    private boolean withinPeriod(String period, LocalTime start, LocalTime end) {
        LocalTime noon = LocalTime.NOON; LocalTime evening = LocalTime.of(18, 0);
        return switch (period) {
            case "MORNING" -> start.isBefore(noon) && !end.isAfter(noon);
            case "AFTERNOON" -> !start.isBefore(noon) && !start.isAfter(evening) && end.isAfter(noon) && !end.isAfter(evening);
            case "EVENING" -> !start.isBefore(evening) && end.isAfter(evening);
            default -> false;
        };
    }

    private void arrayStrings(ObjectNode node, String name) { node.putObject(name).put("type", "ARRAY").putObject("items").put("type", "STRING"); }
    private PlanReschedulePreviewResponse toResponse(PlanReschedulePreview preview, boolean premium) {
        return new PlanReschedulePreviewResponse(preview.getPreviewId(), preview.getRoadmapId(), preview.getScope(), preview.getTargetDate(), premium,
                preview.getStatus(), preview.getProposalSummary(), readList(preview.getProposalDifferences()), readChanges(preview.getProposalJson()),
                readList(preview.getSafetyNotes()), preview.getExpiresAt());
    }
    private List<DailyScheduleChange> readChanges(String proposalJson) {
        try { return objectMapper.readValue(read(proposalJson).path("changes").toString(), new TypeReference<>() {}); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Dữ liệu thay đổi trong preview không hợp lệ.", exception); }
    }
    private PlanRescheduleRequest readRequest(String json) {
        try { return objectMapper.readValue(json, PlanRescheduleRequest.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Yêu cầu reschedule đã lưu không hợp lệ.", exception); }
    }
    private JsonNode read(String json) { try { return objectMapper.readTree(json); } catch (JsonProcessingException exception) { throw new IllegalStateException("Preview không hợp lệ.", exception); } }
    private List<String> readList(String json) { try { return objectMapper.readValue(json, new TypeReference<>() {}); } catch (Exception exception) { return List.of(); } }
    private String write(Object value) { try { return objectMapper.writeValueAsString(value); } catch (JsonProcessingException exception) { throw new IllegalStateException("Không lưu được preview.", exception); } }
    private String requiredText(JsonNode node, String field, int limit) { String value = node.path(field).asText("").trim(); if (value.isBlank() || value.length() > limit) throw new IllegalArgumentException("AI trả thiếu " + field + "."); return value; }
    private List<String> textList(JsonNode node, int max, int length) { List<String> list = new ArrayList<>(); if (node.isArray()) node.forEach(value -> { if (list.size() < max && value.isTextual() && !value.asText().isBlank() && value.asText().length() <= length) list.add(value.asText()); }); return list; }
    private String differenceLine(DailyScheduleChange change) { return change.action() + " · ngày " + (change.dayIndex() + 1) + " " + change.sessionPeriod() + " " + change.startTime() + "–" + change.endTime() + " · " + change.reason(); }
    private JsonNode readJson(String json) { try { return objectMapper.readTree(json == null || json.isBlank() ? "[]" : json); } catch (JsonProcessingException exception) { return objectMapper.createArrayNode(); } }
    private boolean sameVersion(Integer left, Integer right) { return left == null ? right == null : left.equals(right); }
    private String normalize(String status) { return "PLANNED".equals(status) ? "UPCOMING" : status; }
    private String safe(String value) { return value == null ? "" : value; }
    private boolean blank(String value) { return value == null || value.isBlank(); }
}
