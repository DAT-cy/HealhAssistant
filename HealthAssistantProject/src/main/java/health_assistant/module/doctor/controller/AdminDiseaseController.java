package health_assistant.module.doctor.controller;

import health_assistant.config.response.*;
import health_assistant.module.doctor.dto.*;
import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/diseases")
@RequiredArgsConstructor
public class AdminDiseaseController {
    private final DiseaseRepository repository;

    @GetMapping
    public ResponseEntity<DefaultRes<List<DiseaseResponse>>> list() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, repository.findAll().stream().map(DiseaseResponse::from).toList()));
    }

    @PostMapping
    public ResponseEntity<DefaultRes<DiseaseResponse>> create(@Valid @RequestBody DiseaseCreateRequest request) {
        Disease disease = new Disease(); disease.setCode(request.code().trim().toUpperCase()); disease.setName(request.name().trim()); disease.setSpecialty(request.specialty()); disease.setDescription(request.description()); disease.setSeverity(request.severity() == null || request.severity().isBlank() ? "LOW" : request.severity().trim().toUpperCase()); disease.setDoctorRequired(request.doctorRequired()); disease.setRoadmapConfirmationRequired(request.roadmapConfirmationRequired()); disease.setAiAllowed(request.aiAllowed()); disease.setPriority(request.priority()); disease.setUpdatedBy(SecurityUtils.getCurrentUserId()); disease.setUpdatedAt(Instant.now());
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, DiseaseResponse.from(repository.save(disease))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> deactivate(@PathVariable Long id) {
        Disease disease = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh lý.")); disease.setActive(false); disease.setUpdatedBy(SecurityUtils.getCurrentUserId()); disease.setUpdatedAt(Instant.now()); repository.save(disease);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, true));
    }
}
