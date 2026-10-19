package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.AdjustmentEvaluationResponse;
import health_assistant.module.coach.dto.PlanAdjustmentDecisionResponse;
import health_assistant.module.coach.dto.PlanAdjustmentResponse;
import health_assistant.module.coach.service.PlanAdjustmentService;
import health_assistant.utils.ClientUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/plan-adjustments")
@RequiredArgsConstructor
public class PlanAdjustmentController {
    private final PlanAdjustmentService service;

    @PostMapping("/evaluate")
    public ResponseEntity<DefaultRes<AdjustmentEvaluationResponse>> evaluate() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, service.evaluate()));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<PlanAdjustmentResponse>>> history() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.history()));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<DefaultRes<PlanAdjustmentDecisionResponse>> accept(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, service.accept(id)));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<DefaultRes<PlanAdjustmentResponse>> reject(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, service.reject(id)));
    }
}
