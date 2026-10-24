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
import health_assistant.module.coach.service.GeminiCoachService;
import health_assistant.module.coach.service.CoachChatService;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import health_assistant.module.coach.service.RoadmapPreviewService;
import health_assistant.module.coach.service.RoadmapLifecycleService;
import health_assistant.utils.SecurityUtils;
import java.time.Instant;
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
    private final CoachChatService coachChatService;
    private final UserProfileRepository profileRepository;
    private final RoadmapPreviewService roadmapPreviewService;
    private final RoadmapLifecycleService roadmapLifecycleService;

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(
            @Valid @RequestBody GeminiRoadmapRequest request) {
        GeminiRoadmapResponse roadmap = geminiCoachService.plan(request);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmap));
    }

    @PostMapping("/roadmap/preview")
    public ResponseEntity<DefaultRes<RoadmapPreviewResponse>> preview(@Valid @RequestBody GeminiRoadmapRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var profile = profileRepository.findByUserId(userId).orElse(null);
        String measurements = profile == null ? request.postureSummary() : "Tuổi: " + profile.getAge() + ", chiều cao cm: " + profile.getHeightCm()
                + ", cân nặng kg: " + profile.getWeightKg();
        String restrictions = profile == null ? request.restrictions() : String.join("; ", List.of(
                profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                profile.getPainAreas() == null ? "" : profile.getPainAreas()));
        String goal = request.goal();
        var serverRequest = new GeminiRoadmapRequest(goal, request.weeks(), measurements, restrictions);
        var options = List.of(
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên vận động nhẹ, tăng sức bền nền tảng. " + goal)),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên linh hoạt, tư thế và phục hồi. " + goal)),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên sức mạnh toàn thân ở mức phù hợp người mới. " + goal)));
        var preview = roadmapPreviewService.create(userId, profile == null ? Instant.EPOCH : profile.getUpdatedAt(), options);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, preview));
    }

    @PostMapping("/roadmap/activate")
    public ResponseEntity<DefaultRes<RoadmapResponse>> activate(@Valid @RequestBody ActivateRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                roadmapLifecycleService.activate(request.previewId(), request.optionIndex(), request.title(), request.draftId())));
    }

    @PostMapping("/roadmaps/draft")
    public ResponseEntity<DefaultRes<RoadmapResponse>> createDraft(@Valid @RequestBody CreateDraftRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED,
                roadmapLifecycleService.createDraft(request.title())));
    }

    @PatchMapping("/roadmaps/draft/{id}")
    public ResponseEntity<DefaultRes<RoadmapResponse>> renameDraft(@PathVariable Long id, @Valid @RequestBody CreateDraftRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                roadmapLifecycleService.renameDraft(id, request.title())));
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
        return new GeminiRoadmapRequest(goal, request.weeks(), request.postureSummary(), request.restrictions());
    }

    public record ActivateRoadmapRequest(@NotBlank @Size(max = 36) String previewId, @Min(0) @Max(2) int optionIndex,
                                         @Size(max = 120) String title, Long draftId) { }

    public record CreateDraftRequest(@NotBlank @Size(max = 160) String title) { }

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
                coachChatService.reply(request.message(), profileRepository.findByUserId(SecurityUtils.getCurrentUserId()).orElse(null))));
    }
}
