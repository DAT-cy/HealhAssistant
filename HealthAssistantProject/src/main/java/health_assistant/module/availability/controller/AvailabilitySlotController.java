package health_assistant.module.availability.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.availability.dto.AvailabilitySlotRequest;
import health_assistant.module.availability.dto.AvailabilitySlotResponse;
import health_assistant.module.availability.service.AvailabilitySlotService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/availability-slots")
@RequiredArgsConstructor
public class AvailabilitySlotController {
    private final AvailabilitySlotService service;

    @PostMapping
    public ResponseEntity<DefaultRes<AvailabilitySlotResponse>> create(
            @Valid @RequestBody AvailabilitySlotRequest request) {
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, service.create(request)));
    }

    @PostMapping("/batch")
    public ResponseEntity<DefaultRes<List<AvailabilitySlotResponse>>> createBatch(
            @Valid @RequestBody List<@Valid AvailabilitySlotRequest> requests) {
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, service.createBatch(requests)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<AvailabilitySlotResponse>>> listMine() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.listMine()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }
}
