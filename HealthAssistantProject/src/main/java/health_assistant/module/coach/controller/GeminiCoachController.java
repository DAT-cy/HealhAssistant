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

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(@Valid @RequestBody GeminiRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, geminiCoachService.plan(request)));
    }

    @PostMapping("/roadmap/preview")
    public ResponseEntity<DefaultRes<RoadmapPreviewResponse>> preview(@Valid @RequestBody GeminiRoadmapRequest request) {
        scheduleValidator.validate(request.schedule(), request.weeks(), true);
        Long userId = SecurityUtils.getCurrentUserId();
        var profile = profileRepository.findByUserId(userId).orElse(null);
        if (profile != null && !profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (profile != null && (profile.getHeightCm() == null || profile.getWeightKg() == null))
            throw new IllegalArgumentException("Hãy nhập chiều cao và cân nặng trước khi xem phác thảo.");
        String goal = profile == null ? request.goal() : profile.getGoal();
        String measurements = profile == null ? request.postureSummary() : "Tuổi: " + profile.getAge() + ", chiều cao cm: "
                + profile.getHeightCm() + ", cân nặng kg: " + profile.getWeightKg() + ", trình độ vận động: " + profile.getActivityLevel();
        String restrictions = profile == null ? request.restrictions() : String.join("; ", List.of(
                profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                profile.getPainAreas() == null ? "" : profile.getPainAreas()));
        var serverRequest = new GeminiRoadmapRequest(goal, request.weeks(), measurements, restrictions, request.schedule());
        var options = List.of(
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên vận động nhẹ, tăng sức bền nền tảng. " + goal)),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên linh hoạt, tư thế và phục hồi. " + goal)),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên sức mạnh toàn thân ở mức phù hợp người mới. " + goal)));
        Instant profileVersion = profile == null ? Instant.EPOCH : profile.getUpdatedAt();
        var preview = roadmapPreviewService.create(userId, profileVersion, options, request.schedule());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, preview));
    }

    @PostMapping("/roadmap/activate")
    public ResponseEntity<DefaultRes<RoadmapResponse>> activate(@Valid @RequestBody ActivateRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                roadmapLifecycleService.activate(request.previewId(), request.optionIndex(), request.title(), request.draftId())));
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
        return new GeminiRoadmapRequest(goal, request.weeks(), request.postureSummary(), request.restrictions(), request.schedule());
    }

    public record ActivateRoadmapRequest(@NotBlank @Size(max = 36) String previewId, @Min(0) @Max(2) int optionIndex,
                                         @Size(max = 120) String title, Long draftId) {}
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
