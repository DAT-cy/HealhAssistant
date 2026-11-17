package health_assistant.module.doctor.controller;

import health_assistant.config.response.*;
import health_assistant.module.doctor.dto.DoctorReviewRequestResponse;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/doctor-requests")
@RequiredArgsConstructor
public class UserDoctorReviewController {
    private final DoctorReviewRequestRepository repository;

    @GetMapping
    public ResponseEntity<DefaultRes<List<DoctorReviewRequestResponse>>> mine() {
        Long userId = SecurityUtils.getCurrentUserId();
        List<DoctorReviewRequestResponse> result = repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream().filter(item -> userId.equals(item.getUserId())).map(DoctorReviewRequestResponse::from).toList();
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DefaultRes<DoctorReviewRequestResponse>> get(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        DoctorReviewRequest request = repository.findById(id).filter(item -> userId.equals(item.getUserId())).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu bác sĩ."));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, DoctorReviewRequestResponse.from(request)));
    }
}
