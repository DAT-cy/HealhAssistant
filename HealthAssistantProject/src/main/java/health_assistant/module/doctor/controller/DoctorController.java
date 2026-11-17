package health_assistant.module.doctor.controller;

import health_assistant.config.response.*;
import health_assistant.module.doctor.dto.*;
import health_assistant.module.doctor.entity.DoctorProfile;
import health_assistant.module.doctor.service.*;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/doctor")
@RequiredArgsConstructor
public class DoctorController {
    private final DoctorPortalService portalService;
    private final DiseaseRiskAssessmentService riskService;

    @GetMapping("/dashboard")
    public ResponseEntity<DefaultRes<DoctorDashboardResponse>> dashboard() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, portalService.dashboard(SecurityUtils.getCurrentUserId())));
    }

    @GetMapping("/diseases")
    public ResponseEntity<DefaultRes<List<DiseaseResponse>>> diseases(@RequestParam(required = false) String q,
                                                                       @RequestParam(required = false) String severity,
                                                                       @RequestParam(required = false) Boolean doctorRequired) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, riskService.diseases(q, severity, doctorRequired)));
    }

    @PatchMapping("/diseases/{id}/policy")
    public ResponseEntity<DefaultRes<DiseaseResponse>> policy(@PathVariable Long id, @Valid @RequestBody DiseasePolicyUpdateRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, portalService.updatePolicy(id, request, SecurityUtils.getCurrentUserId())));
    }

    @GetMapping("/diseases/{id}/policy-history")
    public ResponseEntity<DefaultRes<List<health_assistant.module.doctor.entity.DiseasePolicyAudit>>> policyHistory(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, portalService.policyHistory(id)));
    }

    @GetMapping("/reviews")
    public ResponseEntity<DefaultRes<List<DoctorReviewRequestResponse>>> reviews(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, portalService.requests(SecurityUtils.getCurrentUserId(), status)));
    }

    @PostMapping("/reviews/{id}/decision")
    public ResponseEntity<DefaultRes<DoctorReviewRequestResponse>> decision(@PathVariable Long id, @Valid @RequestBody DoctorReviewDecisionRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, portalService.decide(id, SecurityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/reviews/{id}/start")
    public ResponseEntity<DefaultRes<DoctorReviewRequestResponse>> start(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, portalService.startReview(id, SecurityUtils.getCurrentUserId())));
    }

    @PutMapping("/profile")
    public ResponseEntity<DefaultRes<DoctorProfile>> profile(@Valid @RequestBody DoctorProfileRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, portalService.saveProfile(SecurityUtils.getCurrentUserId(), request)));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<DefaultRes<Boolean>> heartbeat() {
        portalService.heartbeat(SecurityUtils.getCurrentUserId());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }
}
