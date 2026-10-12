package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.utils.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach")
@RequiredArgsConstructor
public class GeminiCoachController {
    private final GeminiCoachService geminiCoachService;
    private final CoachChatService coachChatService;
    private final UserProfileRepository profileRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final ObjectMapper objectMapper;

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(
            @Valid @RequestBody GeminiRoadmapRequest request) {
        GeminiRoadmapResponse roadmap = geminiCoachService.plan(request);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, roadmap));
    }

    @PostMapping("/roadmap/preview")
    public ResponseEntity<DefaultRes<List<GeminiRoadmapResponse>>> preview(@Valid @RequestBody GeminiRoadmapRequest request) {
        var profile = profileRepository.findByUserId(SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi tạo lộ trình."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (profile.getHeightCm() == null || profile.getWeightKg() == null)
            throw new IllegalArgumentException("Hãy nhập chiều cao và cân nặng trước khi xem phác thảo.");
        String measurements = "Tuổi: " + profile.getAge() + ", chiều cao cm: " + profile.getHeightCm()
                + ", cân nặng kg: " + profile.getWeightKg();
        var serverRequest = new GeminiRoadmapRequest(profile.getGoal(), request.weeks(), measurements,
                String.join("; ", List.of(profile.getRestrictions() == null ? "" : profile.getRestrictions(),
                        profile.getPainAreas() == null ? "" : profile.getPainAreas())));
        var options = List.of(
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên vận động nhẹ, tăng sức bền nền tảng. " + profile.getGoal())),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên linh hoạt, tư thế và phục hồi. " + profile.getGoal())),
                geminiCoachService.plan(withGoal(serverRequest, "Ưu tiên sức mạnh toàn thân ở mức phù hợp người mới. " + profile.getGoal())));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, options));
    }

    @PostMapping("/roadmap/activate")
    public ResponseEntity<DefaultRes<RoadmapRecord>> activate(@Valid @RequestBody ActivateRoadmapRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Hãy lưu hồ sơ trước khi kích hoạt lộ trình."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");
        if (request.weeklyPlan().size() != request.weeks())
            throw new IllegalArgumentException("Số tuần và nội dung lộ trình không khớp.");
        if (!List.of("gemini", "fallback").contains(request.source()))
            throw new IllegalArgumentException("Nguồn lộ trình không hợp lệ.");
        var record = new RoadmapRecord();
        record.setUserId(userId);
        record.setTitle(request.title());
        record.setOverview(request.overview());
        record.setWeeklyPlan(writeJson(request.weeklyPlan()));
        record.setSafetyNotes(writeJson(request.safetyNotes()));
        record.setSource(request.source());
        record.setStatus("ACTIVE");
        record.setStartDate(LocalDate.now());
        record.setDurationWeeks(request.weeks());
        record.setCreatedAt(Instant.now());
        roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").ifPresent(active -> {
            active.setStatus("ARCHIVED");
            roadmapRepository.save(active);
        });
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, roadmapRepository.save(record)));
    }

    @GetMapping("/roadmaps/active")
    public ResponseEntity<DefaultRes<RoadmapRecord>> active() {
        var active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId(), "ACTIVE");
        return active.map(record -> ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, record)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private GeminiRoadmapRequest withGoal(GeminiRoadmapRequest request, String goal) {
        return new GeminiRoadmapRequest(goal, request.weeks(), request.postureSummary(), request.restrictions());
    }

    public record ActivateRoadmapRequest(@NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 2000) String overview, @NotEmpty @Size(max = 12) List<@NotBlank @Size(max = 500) String> weeklyPlan,
            @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 500) String> safetyNotes, @Min(1) @Max(12) int weeks,
            @NotBlank @Size(max = 30) String source) { }

    @GetMapping("/roadmaps/me")
    public ResponseEntity<DefaultRes<List<RoadmapRecord>>> history() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                roadmapRepository.findTop10ByUserIdOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/chat")
    public ResponseEntity<DefaultRes<CoachChatResponse>> chat(@Valid @RequestBody CoachChatRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                coachChatService.reply(request.message(), profileRepository.findByUserId(SecurityUtils.getCurrentUserId()).orElse(null))));
    }

    private String writeJson(List<String> values) {
        try { return objectMapper.writeValueAsString(values); }
        catch (JsonProcessingException exception) { return "[]"; }
    }
}
