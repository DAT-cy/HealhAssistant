package health_assistant.module.progress.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.progress.dto.DailyCheckinRequest;
import health_assistant.module.progress.dto.DailyCheckinResponse;
import health_assistant.module.progress.dto.DailyCheckinSummaryResponse;
import health_assistant.module.progress.service.DailyCheckinService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/daily-checkins")
@RequiredArgsConstructor
public class DailyCheckinController {
    private final DailyCheckinService service;

    @PutMapping("/me/{date}")
    public ResponseEntity<DefaultRes<DailyCheckinResponse>> save(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody DailyCheckinRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, service.save(date, request)));
    }

    @GetMapping("/me/{date}")
    public ResponseEntity<DefaultRes<DailyCheckinResponse>> getMine(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, service.getMine(date)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<DailyCheckinResponse>>> listMine(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.listMine(from, to)));
    }

    @GetMapping("/summary")
    public ResponseEntity<DefaultRes<DailyCheckinSummaryResponse>> summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, service.summary(from, to)));
    }

    @DeleteMapping("/me/{date}")
    public ResponseEntity<DefaultRes<Boolean>> deleteMine(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        service.deleteMine(date);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }
}
