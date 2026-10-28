package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.DailyAiReviewResponse;
import health_assistant.module.coach.service.DailyAiReviewService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/daily-ai-reviews")
@RequiredArgsConstructor
public class DailyAiReviewController {
    private final DailyAiReviewService service;

    @PostMapping("/evaluate")
    public ResponseEntity<DefaultRes<DailyAiReviewResponse>> evaluate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                service.evaluate(SecurityUtils.getCurrentUserId(), date)));
    }

    @GetMapping("/history")
    public ResponseEntity<DefaultRes<List<DailyAiReviewResponse>>> history(@RequestParam(required = false) Long roadmapId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                service.history(SecurityUtils.getCurrentUserId(), roadmapId)));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<DefaultRes<DailyAiReviewResponse>> accept(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.accept(SecurityUtils.getCurrentUserId(), id)));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<DefaultRes<DailyAiReviewResponse>> reject(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.reject(SecurityUtils.getCurrentUserId(), id)));
    }
}
