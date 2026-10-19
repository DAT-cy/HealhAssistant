package health_assistant.module.goals.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.goals.dto.HealthGoalRequest;
import health_assistant.module.goals.dto.HealthGoalResponse;
import health_assistant.module.goals.dto.HealthGoalStatusRequest;
import health_assistant.module.goals.service.HealthGoalService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/health-goals")
@RequiredArgsConstructor
public class HealthGoalController {
    private final HealthGoalService service;

    @PostMapping
    public ResponseEntity<DefaultRes<HealthGoalResponse>> create(@Valid @RequestBody HealthGoalRequest request) {
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, service.create(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<HealthGoalResponse>>> listMine() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.listMine()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DefaultRes<HealthGoalResponse>> updateStatus(
            @PathVariable Long id, @Valid @RequestBody HealthGoalStatusRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.updateStatus(id, request.status())));
    }
}
