package health_assistant.module.posture.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.posture.dto.PostureAssessmentRequest;
import health_assistant.module.posture.dto.PostureAssessmentResponse;
import health_assistant.module.posture.service.PostureAssessmentService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/posture")
@RequiredArgsConstructor
public class PostureController {
    private final PostureAssessmentService assessmentService;

    @PostMapping("/assess")
    public ResponseEntity<DefaultRes<PostureAssessmentResponse>> assess(
            @Valid @RequestBody PostureAssessmentRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                assessmentService.assess(request)));
    }
}
