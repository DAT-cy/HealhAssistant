package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.PlanReschedulePreviewResponse;
import health_assistant.module.coach.dto.PlanRescheduleRequest;
import health_assistant.module.coach.service.PlanRescheduleService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach/reschedules")
@RequiredArgsConstructor
public class PlanRescheduleController {
    private final PlanRescheduleService service;

    @PostMapping("/preview")
    public ResponseEntity<DefaultRes<PlanReschedulePreviewResponse>> preview(@Valid @RequestBody PlanRescheduleRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                service.preview(SecurityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/{previewId}/confirm")
    public ResponseEntity<DefaultRes<PlanReschedulePreviewResponse>> confirm(@PathVariable String previewId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.confirm(SecurityUtils.getCurrentUserId(), previewId)));
    }

    @PostMapping("/{previewId}/reject")
    public ResponseEntity<DefaultRes<PlanReschedulePreviewResponse>> reject(@PathVariable String previewId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.reject(SecurityUtils.getCurrentUserId(), previewId)));
    }

    @GetMapping("/history")
    public ResponseEntity<DefaultRes<List<PlanReschedulePreviewResponse>>> history(@RequestParam(required = false) Long roadmapId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                service.history(SecurityUtils.getCurrentUserId(), roadmapId)));
    }
}
