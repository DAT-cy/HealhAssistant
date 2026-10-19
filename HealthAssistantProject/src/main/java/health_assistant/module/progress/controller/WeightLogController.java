package health_assistant.module.progress.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.progress.dto.WeightLogRequest;
import health_assistant.module.progress.dto.WeightLogResponse;
import health_assistant.module.progress.service.WeightLogService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/weight-logs")
@RequiredArgsConstructor
public class WeightLogController {
    private final WeightLogService service;

    @PostMapping
    public ResponseEntity<DefaultRes<WeightLogResponse>> save(@Valid @RequestBody WeightLogRequest request) {
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, service.save(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<WeightLogResponse>>> listMine(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.listMine(from, to)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> deleteMine(@PathVariable Long id) {
        service.deleteMine(id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }
}
