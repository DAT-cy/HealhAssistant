package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.*;
import health_assistant.module.coach.service.CoachChatConversationService;
import health_assistant.module.coach.service.GeminiCoachService;
import health_assistant.module.coach.service.RoadmapLifecycleService;
import health_assistant.module.coach.service.RoadmapPreviewService;
import health_assistant.module.coach.service.RoadmapScheduleValidator;
import health_assistant.module.doctor.dto.RiskRoutingDecision;
import health_assistant.module.doctor.repository.DoctorReviewRepository;
import health_assistant.module.doctor.service.DiseaseRiskAssessmentService;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach")
@RequiredArgsConstructor
public class GeminiCoachController {
    private final GeminiCoachService geminiCoachService;
    private final CoachChatConversationService conversationService;
    private final UserProfileRepository profileRepository;
    private final RoadmapPreviewService roadmapPreviewService;
    private final RoadmapLifecycleService roadmapLifecycleService;
    private final RoadmapScheduleValidator scheduleValidator;
    private final DiseaseRiskAssessmentService riskAssessmentService;
    private final DoctorReviewRepository doctorReviewRepository;
    private final health_assistant.module.coach.service.DoctorRevisionService doctorRevisionService;
    private final health_assistant.module.personalassistant.repository.PersonalAssistantProfileRepository personalProfileRepository;

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(@Valid @RequestBody GeminiRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, geminiCoachService.plan(request)));
    }

    @PostMapping("/roadmap/preview")
    public ResponseEntity<DefaultRes<RoadmapPreviewResponse>> preview(@Valid @RequestBody GeminiRoadmapRequest request) {
        scheduleValidator.validate(request.schedule(), request.weeks(), true);
        Long userId = SecurityUtils.getCurrentUserId();
        var profile = profileRepository.findByUserId(userId).orElse(null);
        // Bắt buộc hoàn thành Hồ sơ sức khoẻ và Cài đặt cá nhân trước khi tạo lộ trình (thiết lập 1 lần).
        if (profile == null) throw new IllegalArgumentException("Hãy hoàn thành Hồ sơ sức khỏe trước khi tạo lộ trình.");
        if (personalProfileRepository.findByUserId(userId).isEmpty()) throw new IllegalArgumentException("Hãy hoàn thành Cài đặt cá nhân trước khi tạo lộ trình.");
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (profile != null && (profile.getHeightCm() == null || profile.getWeightKg() == null))
            throw new IllegalArgumentException("Hãy nhập chiều cao và cân nặng trước khi xem phác thảo.");
        String goal = profile == null ? request.goal() : profile.getGoal();
        String measurements = profile == null ? request.postureSummary() : measurements(profile);
        String restrictions = profile == null ? request.restrictions() : joinNonBlank("; ", profile.getRestrictions(), profile.getPainAreas());
        String fullText = joinNonBlank("\n", measurements, restrictions);
        Instant profileVersion = profile == null ? Instant.EPOCH : profile.getUpdatedAt();
        // Không tin danh sách bệnh từ app: luôn gộp thêm bệnh đã khai trong Hồ sơ sức khoẻ,
        // để người dùng không thể bỏ tick bệnh trong wizard rồi đi thẳng luồng AI tự động.
        List<String> diseaseCodes = mergeDiseaseCodes(request.diseaseCodes(), profile == null ? null : profile.getDiseaseCodes());
        var assessment = riskAssessmentService.assess(diseaseCodes);

        if (assessment.auto()) {
            var serverRequest = new GeminiRoadmapRequest(goal, request.weeks(), measurements, restrictions, request.schedule(), diseaseCodes);
            return ok(roadmapPreviewService.create(userId, profileVersion, generateOptions(serverRequest, goal), request.schedule()));
        }
        if (assessment.urgent()) {
            RiskRoutingDecision routing = riskAssessmentService.submit(userId, null, assessment, fullText, null, null, null);
            return ok(routed(routing));
        }
        // Bác sĩ đã duyệt → cho người dùng chọn đúng phương án bác sĩ đã xem.
        var approved = riskAssessmentService.findApprovedRequest(userId, assessment);
        if (approved.isPresent()) {
            var approvedRequest = approved.get();
            List<GeminiRoadmapResponse> options = approvedRequest.getAiPlanJson() == null || approvedRequest.getAiPlanJson().isBlank()
                    ? generateOptions(new GeminiRoadmapRequest(goal, request.weeks(), measurements, restrictions, request.schedule(), diseaseCodes), goal)
                    : roadmapPreviewService.readOptions(approvedRequest.getAiPlanJson());
            return ok(roadmapPreviewService.create(userId, profileVersion, options, request.schedule(), approvedRequest.getId(),
                    "Bác sĩ đã duyệt phương án. Hãy chọn một phương án để kích hoạt."));
        }
        // Đang chờ bác sĩ → không gọi AI lại, trả yêu cầu đang mở.
        var open = riskAssessmentService.findOpenRequest(userId, assessment.decision());
        if (open.isPresent()) {
            return ok(new RoadmapPreviewResponse(null, List.of(), assessment.decision(), open.get().getId(), "Yêu cầu trước đó vẫn đang được bác sĩ xử lý."));
        }
        // AI lập phương án trước, rồi gửi kèm cho bác sĩ duyệt. Nếu bác sĩ từng yêu cầu sửa → đưa nhận xét vào cho AI.
        var revision = riskAssessmentService.findLatestRevision(userId, assessment);
        String doctorFeedback = revision.flatMap(r -> doctorReviewRepository.findFirstByRequestIdOrderByCreatedAtDescIdDesc(r.getId()))
                .map(review -> review.getNote()).filter(note -> note != null && !note.isBlank())
                .map(note -> "Bác sĩ yêu cầu điều chỉnh phương án trước: " + note.trim()).orElse(null);
        String aiRestrictions = joinNonBlank("; ", doctorFeedback, restrictions); // nhận xét bác sĩ đặt trước vì prompt cắt ở 500 ký tự
        var serverRequest = new GeminiRoadmapRequest(goal, request.weeks(), measurements, aiRestrictions, request.schedule(), diseaseCodes);
        List<GeminiRoadmapResponse> options = generateOptions(serverRequest, goal);
        RiskRoutingDecision routing = riskAssessmentService.submit(userId, null, assessment, fullText,
                roadmapPreviewService.toJson(options), roadmapPreviewService.toJson(request.schedule() == null ? List.of() : request.schedule()),
                revision.orElse(null));
        return ok(routed(routing));
    }

    private List<GeminiRoadmapResponse> generateOptions(GeminiRoadmapRequest serverRequest, String goal) {
        return geminiCoachService.planOptions(withGoal(serverRequest, goal));
    }

    private static RoadmapPreviewResponse routed(RiskRoutingDecision routing) {
        return new RoadmapPreviewResponse(null, List.of(), routing.decision(), routing.reviewRequestId(), routing.reason());
    }

    private static ResponseEntity<DefaultRes<RoadmapPreviewResponse>> ok(RoadmapPreviewResponse body) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, body));
    }

    /** Tóm tắt chỉ số, bỏ qua trường chưa nhập (tránh "Tuổi: null"). */
    public static String measurements(health_assistant.module.profile.entity.UserProfile profile) {
        List<String> parts = new java.util.ArrayList<>();
        parts.add("Tuổi: " + (profile.getAge() == null ? "chưa cập nhật" : profile.getAge()));
        if (profile.getHeightCm() != null) parts.add("chiều cao cm: " + profile.getHeightCm());
        if (profile.getWeightKg() != null) parts.add("cân nặng kg: " + profile.getWeightKg());
        if (profile.getActivityLevel() != null && !profile.getActivityLevel().isBlank() && !"UNSPECIFIED".equals(profile.getActivityLevel()))
            parts.add("trình độ vận động: " + profile.getActivityLevel());
        return String.join(", ", parts);
    }

    /**
     * Gộp mã bệnh app gửi với bệnh trong hồ sơ. Hồ sơ lưu dạng "CODE", "CODE:TRẠNG_THÁI:ghi chú"
     * hoặc bệnh ngoài danh mục "CUSTOM:Tên bệnh[:TRẠNG_THÁI]" → giữ thành "CUSTOM:Tên bệnh" để bác sĩ thấy tên.
     */
    static List<String> mergeDiseaseCodes(List<String> requested, String profileCodes) {
        java.util.LinkedHashSet<String> codes = new java.util.LinkedHashSet<>();
        if (requested != null) requested.stream().filter(java.util.Objects::nonNull).map(String::trim)
                .filter(c -> !c.isEmpty() && !c.equalsIgnoreCase("CUSTOM")).forEach(codes::add);
        if (profileCodes != null) {
            for (String item : profileCodes.split("[,;\\n]")) {
                String[] parts = item.trim().split(":");
                String code = parts[0].trim();
                if (code.equalsIgnoreCase("CUSTOM")) {
                    String name = parts.length > 1 ? parts[1].trim() : "";
                    if (!name.isEmpty()) codes.add("CUSTOM:" + (name.length() > 60 ? name.substring(0, 60) : name));
                } else if (!code.isEmpty() && code.matches("[A-Za-z0-9_.-]{1,40}")) {
                    codes.add(code);
                }
            }
        }
        return List.copyOf(codes);
    }

    public static String joinNonBlank(String separator, String... values) {
        return java.util.Arrays.stream(values).filter(v -> v != null && !v.isBlank()).map(String::trim).collect(java.util.stream.Collectors.joining(separator));
    }

    /** Người dùng mở phương án bác sĩ đã duyệt ngay từ thẻ yêu cầu (không phải đi lại wizard). */
    @PostMapping("/roadmap/approved/{requestId}/preview")
    public ResponseEntity<DefaultRes<RoadmapPreviewResponse>> approvedPreview(@PathVariable Long requestId) {
        Long userId = SecurityUtils.getCurrentUserId();
        var approved = riskAssessmentService.approvedRequestOf(userId, requestId);
        if (approved.getAiPlanJson() == null || approved.getAiPlanJson().isBlank())
            throw new IllegalArgumentException("Yêu cầu này được tạo trước khi có phương án AI. Hãy bấm \"Tạo lộ trình\" để AI lập phương án theo kết quả duyệt.");
        var profile = profileRepository.findByUserId(userId).orElse(null);
        Instant profileVersion = profile == null ? Instant.EPOCH : profile.getUpdatedAt();
        return ok(roadmapPreviewService.create(userId, profileVersion, roadmapPreviewService.readOptions(approved.getAiPlanJson()),
                roadmapPreviewService.readScheduleJson(approved.getScheduleJson()), approved.getId(),
                "Bác sĩ đã duyệt phương án. Hãy chọn một phương án để kích hoạt."));
    }

    /** Người dùng thử lại khi AI chưa tính lại được phương án sau "Yêu cầu sửa" của bác sĩ. */
    @PostMapping("/roadmap/revisions/{requestId}/retry")
    public ResponseEntity<DefaultRes<Boolean>> retryRevision(@PathVariable Long requestId) {
        doctorRevisionService.retry(SecurityUtils.getCurrentUserId(), requestId);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, true));
    }

    @PostMapping("/roadmap/activate")
    public ResponseEntity<DefaultRes<RoadmapResponse>> activate(@Valid @RequestBody ActivateRoadmapRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var reviewRequestId = roadmapPreviewService.reviewRequestIdOf(request.previewId(), userId);
        RoadmapResponse activated = roadmapLifecycleService.activate(request.previewId(), request.optionIndex(), request.title(), request.draftId(), request.startDate());
        // Phương án do bác sĩ duyệt → đánh dấu đã áp dụng để lần sau không dùng lại.
        reviewRequestId.ifPresent(id -> riskAssessmentService.markApplied(id, userId, activated.id()));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, activated));
    }

    @PostMapping("/roadmaps/draft")
    public ResponseEntity<DefaultRes<RoadmapResponse>> createDraft(@Valid @RequestBody CreateDraftRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED,
                roadmapLifecycleService.createDraft(request.title())));
    }

    @PatchMapping("/roadmaps/draft/{id}")
    public ResponseEntity<DefaultRes<RoadmapResponse>> renameDraft(@PathVariable Long id, @Valid @RequestBody CreateDraftRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, roadmapLifecycleService.renameDraft(id, request.title())));
    }

    @DeleteMapping("/roadmaps/draft/{id}")
    public ResponseEntity<DefaultRes<Boolean>> deleteDraft(@PathVariable Long id) {
        roadmapLifecycleService.deleteDraft(id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }

    @GetMapping("/roadmaps/active")
    public ResponseEntity<DefaultRes<RoadmapResponse>> active() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmapLifecycleService.active()));
    }

    private GeminiRoadmapRequest withGoal(GeminiRoadmapRequest request, String goal) {
        return new GeminiRoadmapRequest(goal, request.weeks(), request.postureSummary(), request.restrictions(), request.schedule(), request.diseaseCodes());
    }

    public record ActivateRoadmapRequest(@NotBlank @Size(max = 36) String previewId, @Min(0) @Max(2) int optionIndex,
                                         @Size(max = 120) String title, Long draftId, LocalDate startDate) {}
    public record CreateDraftRequest(@NotBlank @Size(max = 160) String title) {}

    @GetMapping("/roadmaps/me")
    public ResponseEntity<DefaultRes<List<RoadmapResponse>>> history() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmapLifecycleService.history()));
    }

    @GetMapping("/roadmaps/{id}")
    public ResponseEntity<DefaultRes<RoadmapResponse>> getMine(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmapLifecycleService.getMine(id)));
    }

    @PostMapping("/chat")
    public ResponseEntity<DefaultRes<CoachChatResponse>> chat(@Valid @RequestBody CoachChatRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                conversationService.reply(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/chat/{threadId}")
    public ResponseEntity<DefaultRes<List<CoachChatMessageResponse>>> chatHistory(@PathVariable String threadId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                conversationService.history(SecurityUtils.getCurrentUserId(), threadId)));
    }

    @GetMapping("/chat/threads")
    public ResponseEntity<DefaultRes<List<CoachChatThreadResponse>>> chatThreads() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                conversationService.threads(SecurityUtils.getCurrentUserId())));
    }

    @DeleteMapping("/chat/{threadId}")
    public ResponseEntity<DefaultRes<Boolean>> deleteChat(@PathVariable String threadId) {
        conversationService.deleteThread(SecurityUtils.getCurrentUserId(), threadId);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }
}
