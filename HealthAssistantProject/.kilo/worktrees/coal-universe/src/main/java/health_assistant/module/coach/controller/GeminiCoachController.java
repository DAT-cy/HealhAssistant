package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.service.GeminiCoachService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach")
@RequiredArgsConstructor
public class GeminiCoachController {
    private final GeminiCoachService geminiCoachService;

    @PostMapping("/roadmap")
    public ResponseEntity<DefaultRes<GeminiRoadmapResponse>> roadmap(
            @Valid @RequestBody GeminiRoadmapRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                geminiCoachService.plan(request)));
    }
}
