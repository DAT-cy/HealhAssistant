package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.CoachChatRequest;
import health_assistant.module.coach.dto.CoachChatResponse;
import health_assistant.module.coach.service.GeminiCoachService;
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

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach")
@RequiredArgsConstructor
public class GeminiCoachController {
    private final GeminiCoachService geminiCoachService;
    private final RoadmapRecordRepository roadmapRepository;
    private final ObjectMapper objectMapper;

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(
            @Valid @RequestBody GeminiRoadmapRequest request) {
        GeminiRoadmapResponse roadmap = geminiCoachService.plan(request);
        RoadmapRecord record = new RoadmapRecord();
        record.setUserId(SecurityUtils.getCurrentUserId());
        record.setTitle(roadmap.title());
        record.setOverview(roadmap.overview());
        record.setWeeklyPlan(writeJson(roadmap.weeklyPlan()));
        record.setSafetyNotes(writeJson(roadmap.safetyNotes()));
        record.setSource(roadmap.source());
        record.setCreatedAt(Instant.now());
        roadmapRepository.save(record);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, roadmap));
    }

    @GetMapping("/roadmaps/me")
    public ResponseEntity<DefaultRes<List<RoadmapRecord>>> history() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                roadmapRepository.findTop10ByUserIdOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/chat")
    public ResponseEntity<DefaultRes<CoachChatResponse>> chat(@Valid @RequestBody CoachChatRequest request) {
        String normalized = request.message().toLowerCase(java.util.Locale.ROOT);
        boolean safety = normalized.contains("đau") || normalized.contains("tổn thương")
                || normalized.contains("injury") || normalized.contains("pain");
        String message = safety
                ? "Nếu bạn đang cảm thấy đau, hãy dừng bài hoặc giảm tải ngay. Công cụ này chỉ hỗ trợ tập luyện; hãy trao đổi với chuyên gia phù hợp nếu cần."
                : "Hãy bắt đầu ở cường độ vừa, ưu tiên kỹ thuật và nghỉ đủ giữa các hiệp. Bạn có thể xem kế hoạch hôm nay trong mục Kế hoạch.";
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                new CoachChatResponse(message, "rule-based", safety)));
    }

    private String writeJson(List<String> values) {
        try { return objectMapper.writeValueAsString(values); }
        catch (JsonProcessingException exception) { return "[]"; }
    }
}
