package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.CompleteRoadmapSlotRequest;
import health_assistant.module.coach.dto.RoadmapDayResponse;
import health_assistant.module.coach.dto.RoadmapPlanSlotResponse;
import health_assistant.module.coach.dto.RoadmapPlanSlotStatusRequest;
import health_assistant.module.coach.dto.RoadmapProgressResponse;
import health_assistant.module.coach.dto.SkipRoadmapSlotRequest;
import health_assistant.module.coach.service.RoadmapPlanSlotService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping(ClientUtils.VERSION + "/coach/roadmaps")
@RequiredArgsConstructor
public class RoadmapScheduleController {
    private final RoadmapPlanSlotService scheduleService;

    @GetMapping("/{roadmapId}/schedule")
    public ResponseEntity<DefaultRes<List<RoadmapPlanSlotResponse>>> schedule(
            @PathVariable Long roadmapId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<RoadmapPlanSlotResponse> schedule = from == null && to == null
                ? scheduleService.listMine(roadmapId) : scheduleService.listRange(roadmapId, from, to);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, schedule));
    }

    @GetMapping("/{roadmapId}/schedule/day")
    public ResponseEntity<DefaultRes<RoadmapDayResponse>> day(
            @PathVariable Long roadmapId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, scheduleService.day(roadmapId, date)));
    }

    @GetMapping("/{roadmapId}/schedule/history")
    public ResponseEntity<DefaultRes<List<RoadmapPlanSlotResponse>>> history(
            @PathVariable Long roadmapId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                scheduleService.listRange(roadmapId, from, to).stream()
                        .filter(slot -> !"UPCOMING".equals(slot.status()) && !"IN_PROGRESS".equals(slot.status())).toList()));
    }

    @GetMapping("/{roadmapId}/progress")
    public ResponseEntity<DefaultRes<RoadmapProgressResponse>> progress(@PathVariable Long roadmapId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, scheduleService.progress(roadmapId)));
    }

    @PostMapping("/{roadmapId}/schedule/{slotId}/start")
    public ResponseEntity<DefaultRes<RoadmapPlanSlotResponse>> start(@PathVariable Long roadmapId, @PathVariable Long slotId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, scheduleService.start(roadmapId, slotId)));
    }

    @PostMapping("/{roadmapId}/schedule/{slotId}/complete")
    public ResponseEntity<DefaultRes<RoadmapPlanSlotResponse>> complete(
            @PathVariable Long roadmapId, @PathVariable Long slotId,
            @Valid @RequestBody(required = false) CompleteRoadmapSlotRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                scheduleService.complete(roadmapId, slotId, request == null ? new CompleteRoadmapSlotRequest(null, null) : request)));
    }

    @PostMapping("/{roadmapId}/schedule/{slotId}/skip")
    public ResponseEntity<DefaultRes<RoadmapPlanSlotResponse>> skip(
            @PathVariable Long roadmapId, @PathVariable Long slotId,
            @Valid @RequestBody(required = false) SkipRoadmapSlotRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                scheduleService.skip(roadmapId, slotId, request == null ? new SkipRoadmapSlotRequest(null) : request)));
    }

    @PostMapping("/{roadmapId}/schedule/{slotId}/cancel")
    public ResponseEntity<DefaultRes<RoadmapPlanSlotResponse>> cancel(@PathVariable Long roadmapId, @PathVariable Long slotId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, scheduleService.cancel(roadmapId, slotId)));
    }

    @PatchMapping("/{roadmapId}/schedule/{slotId}")
    public ResponseEntity<DefaultRes<RoadmapPlanSlotResponse>> updateStatus(
            @PathVariable Long roadmapId, @PathVariable Long slotId,
            @Valid @RequestBody RoadmapPlanSlotStatusRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                scheduleService.updateStatus(roadmapId, slotId, request)));
    }
}
