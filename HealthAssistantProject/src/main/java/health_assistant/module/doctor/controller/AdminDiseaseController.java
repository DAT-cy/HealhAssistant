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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/diseases")
@RequiredArgsConstructor
public class AdminDiseaseController {
    static final List<String> SEVERITIES = List.of("LOW", "MODERATE", "HIGH", "CRITICAL");
    private final DiseaseRepository repository;

    @GetMapping
    public ResponseEntity<DefaultRes<List<DiseaseResponse>>> list() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, repository.findAll().stream().map(DiseaseResponse::from).toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<DefaultRes<DiseaseResponse>> create(@Valid @RequestBody DiseaseCreateRequest request) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (repository.existsByCodeIgnoreCase(code)) throw new IllegalArgumentException("Mã bệnh " + code + " đã tồn tại (có thể đang ngưng). Hãy sửa bệnh đó thay vì tạo mới.");
        Disease disease = new Disease(); disease.setCode(code); disease.setName(request.name().trim()); disease.setSpecialty(blankToNull(request.specialty())); disease.setDescription(request.description()); disease.setSeverity(severity(request.severity())); disease.setDoctorRequired(request.doctorRequired()); disease.setRoadmapConfirmationRequired(request.roadmapConfirmationRequired()); disease.setAiAllowed(request.aiAllowed()); disease.setPriority(request.priority()); disease.setUpdatedBy(SecurityUtils.getCurrentUserId()); disease.setUpdatedAt(Instant.now());
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, DiseaseResponse.from(repository.save(disease))));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<DefaultRes<DiseaseResponse>> update(@PathVariable Long id, @Valid @RequestBody DiseaseUpdateRequest request) {
        Disease disease = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh lý."));
        disease.setName(request.name().trim()); disease.setSpecialty(blankToNull(request.specialty())); disease.setDescription(request.description());
        disease.setSymptoms(request.symptoms()); disease.setCauses(request.causes()); disease.setRiskFactors(request.riskFactors()); disease.setCareGuidance(request.careGuidance()); disease.setReferenceSource(request.referenceSource());
        disease.setSeverity(severity(request.severity())); disease.setDoctorRequired(request.doctorRequired()); disease.setRoadmapConfirmationRequired(request.roadmapConfirmationRequired()); disease.setAiAllowed(request.aiAllowed()); disease.setPriority(request.priority()); disease.setSpecialInstructions(request.specialInstructions());
        if (request.active() != null) disease.setActive(request.active());
        disease.setUpdatedBy(SecurityUtils.getCurrentUserId()); disease.setUpdatedAt(Instant.now());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, DiseaseResponse.from(repository.save(disease))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> deactivate(@PathVariable Long id) {
        Disease disease = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh lý.")); disease.setActive(false); disease.setUpdatedBy(SecurityUtils.getCurrentUserId()); disease.setUpdatedAt(Instant.now()); repository.save(disease);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, true));
    }

    static String severity(String value) {
        String normalized = value == null || value.isBlank() ? "LOW" : value.trim().toUpperCase(Locale.ROOT);
        if (!SEVERITIES.contains(normalized)) throw new IllegalArgumentException("Mức độ không hợp lệ (LOW, MODERATE, HIGH, CRITICAL).");
        return normalized;
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
