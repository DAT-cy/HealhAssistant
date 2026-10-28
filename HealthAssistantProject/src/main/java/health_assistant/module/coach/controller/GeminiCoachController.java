package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapPreviewResponse;
import health_assistant.module.coach.dto.RoadmapResponse;
import health_assistant.module.coach.dto.CoachChatRequest;
import health_assistant.module.coach.dto.CoachChatResponse;
import health_assistant.module.coach.dto.CoachChatMessageResponse;
import health_assistant.module.coach.dto.CoachChatThreadResponse;
import health_assistant.module.coach.service.GeminiCoachService;
import health_assistant.module.coach.service.CoachChatConversationService;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import health_assistant.module.coach.service.RoadmapPreviewService;
import health_assistant.module.coach.service.RoadmapLifecycleService;
import health_assistant.module.coach.service.RoadmapScheduleValidator;
import health_assistant.utils.SecurityUtils;
import java.util.List;
import org.springframework.web.bind.annotation.PathVariable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

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
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(
            @Valid @RequestBody GeminiRoadmapRequest request) {
        GeminiRoadmapResponse roadmap = geminiCoachService.plan(request);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmap));
    }

    @PostMapping("/roadmap/preview")
    public ResponseEntity<DefaultRes<RoadmapPreviewResponse>> preview(@Valid @RequestBody GeminiRoadmapRequest request) {
        scheduleValidator.validate(request.schedule(), request.weeks(), true);
        var profile = profileRepository.findByUserId(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi tạo lộ trình."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (profile.getHeightCm() == null || profile.getWeightKg() == null)
            throw new IllegalArgumentException("Hãy nhập chiều cao và cân nặng trước khi xem phác thảo.");
        String measurements = "Tuổi: " + profile.getAge() + ", chiều cao cm: " + profile.getHeightCm()
                + ", cân nặng kg: " + profile.getWeightKg() + ", trình độ vận động người dùng tự khai báo: "
                + profile.getActivityLevel();
        var serverRequest = new GeminiRoadmapRequest(profile.getGoal(), request.weeks(), measurements,
                String.join("; ", List.of(profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                        profile.getPainAreas() == null ? "" : profile.getPainAreas())), request.schedule());
        var options = List.of(
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên vận động nhẹ, tăng sức bền nền tảng. " + profile.getGoal())),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên linh hoạt, tư thế và phục hồi. " + profile.getGoal())),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên sức mạnh toàn thân ở mức phù hợp người mới. " + profile.getGoal())));
        var preview = roadmapPreviewService.create(profile.getUserId(), profile.getUpdatedAt(), options, request.schedule());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, preview));
    }

    @PostMapping("/roadmap/activate")
    public ResponseEntity<DefaultRes<RoadmapResponse>> activate(@Valid @RequestBody ActivateRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                roadmapLifecycleService.activate(request.previewId(), request.optionIndex())));
    }

    @GetMapping("/roadmaps/active")
    public ResponseEntity<DefaultRes<RoadmapResponse>> active() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmapLifecycleService.active()));
    }

    private GeminiRoadmapRequest withGoal(GeminiRoadmapRequest request, String goal) {
        return new GeminiRoadmapRequest(goal, request.weeks(), request.postureSummary(), request.restrictions(), request.schedule());
    }

    public record ActivateRoadmapRequest(@NotBlank @Size(max = 36) String previewId, @Min(0) @Max(2) int optionIndex) { }

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

    @org.springframework.web.bind.annotation.DeleteMapping("/chat/{threadId}")
    public ResponseEntity<DefaultRes<Boolean>> deleteChat(@PathVariable String threadId) {
        conversationService.deleteThread(SecurityUtils.getCurrentUserId(), threadId);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }
}
