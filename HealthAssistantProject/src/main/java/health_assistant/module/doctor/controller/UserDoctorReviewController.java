package health_assistant.module.doctor.controller;

import health_assistant.config.response.*;
import health_assistant.module.doctor.dto.DoctorRequestReplyRequest;
import health_assistant.module.doctor.dto.DoctorReviewRequestResponse;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import health_assistant.module.doctor.service.DiseaseRiskAssessmentService;
import health_assistant.module.doctor.service.DoctorReviewResponseMapper;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/doctor-requests")
@RequiredArgsConstructor
public class UserDoctorReviewController {
    private final DoctorReviewRequestRepository repository;
    private final DoctorReviewResponseMapper responseMapper;
    private final DiseaseRiskAssessmentService riskService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<DefaultRes<List<DoctorReviewRequestResponse>>> mine() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<DoctorReviewRequestResponse> result = repository.findAllByUserIdOrderByCreatedAtDesc(userId).stream().map(responseMapper::toResponse).toList();
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, result));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<DefaultRes<DoctorReviewRequestResponse>> get(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        DoctorReviewRequest request = repository.findById(id).filter(item -> userId.equals(item.getUserId())).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu bác sĩ."));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, responseMapper.toResponse(request)));
    }

    /** Người dùng bổ sung thông tin khi bác sĩ chọn "Cần thêm thông tin". */
    @PostMapping("/{id}/reply")
    public ResponseEntity<DefaultRes<DoctorReviewRequestResponse>> reply(@PathVariable Long id, @Valid @RequestBody DoctorRequestReplyRequest body) {
        DoctorReviewRequest updated = riskService.reply(SecurityUtils.getCurrentUserId(), id, body.message());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, responseMapper.toResponse(updated)));
    }
}
