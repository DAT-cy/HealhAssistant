package health_assistant.module.workout.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.workout.dto.ActivitySessionResponse;
import health_assistant.module.workout.dto.ActivitySessionStartRequest;
import health_assistant.module.workout.dto.ActivityReviewResponse;
import health_assistant.module.workout.dto.FinishActivitySessionRequest;
import health_assistant.module.workout.service.ActivitySessionService;
import health_assistant.module.workout.service.ActivitySessionReviewService;
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
@RequestMapping(ClientUtils.VERSION + "/activity-sessions")
@RequiredArgsConstructor
public class ActivitySessionController {
    private final ActivitySessionService service;
    private final ActivitySessionReviewService reviewService;

    @PostMapping
    public ResponseEntity<DefaultRes<ActivitySessionResponse>> start(@Valid @RequestBody ActivitySessionStartRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED,
                service.start(SecurityUtils.getCurrentUserId(), request.roadmapId(), request.planSlotId())));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<DefaultRes<ActivitySessionResponse>> pause(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, service.pause(SecurityUtils.getCurrentUserId(), id)));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<DefaultRes<ActivitySessionResponse>> resume(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, service.resume(SecurityUtils.getCurrentUserId(), id)));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<DefaultRes<ActivitySessionResponse>> finish(
            @PathVariable Long id, @Valid @RequestBody(required = false) FinishActivitySessionRequest request) {
        FinishActivitySessionRequest result = request == null ? new FinishActivitySessionRequest(null, null, null, null, List.of(), null) : request;
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.finish(SecurityUtils.getCurrentUserId(), id, result)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<DefaultRes<ActivitySessionResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, service.cancel(SecurityUtils.getCurrentUserId(), id)));
    }

    @GetMapping("/history")
    public ResponseEntity<DefaultRes<List<ActivitySessionResponse>>> history(
            @RequestParam Long roadmapId, @RequestParam Long planSlotId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                service.history(SecurityUtils.getCurrentUserId(), roadmapId, planSlotId)));
    }

    @GetMapping("/{id}/review")
    public ResponseEntity<DefaultRes<ActivityReviewResponse>> review(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, reviewService.review(id)));
    }
}
