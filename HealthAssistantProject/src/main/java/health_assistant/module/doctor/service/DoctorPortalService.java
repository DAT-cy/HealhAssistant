package health_assistant.module.doctor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.doctor.dto.*;
import health_assistant.module.doctor.entity.*;
import health_assistant.module.doctor.repository.*;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class DoctorPortalService {
    private final DoctorProfileRepository doctorRepository;
    private final DiseaseRepository diseaseRepository;
    private final DiseasePolicyAuditRepository policyAuditRepository;
    private final DoctorReviewRequestRepository requestRepository;
    private final DoctorReviewRepository reviewRepository;
    private final ObjectMapper objectMapper;
    private final DoctorReviewResponseMapper responseMapper;

    /** Trạng thái bác sĩ còn được ra quyết định. */
    static final List<String> DECIDABLE_STATUSES = List.of("ASSIGNED", "IN_REVIEW", "NEED_MORE_INFO");

    @Transactional
    public DoctorProfile saveProfile(Long doctorId, DoctorProfileRequest request) {
        DoctorProfile profile = doctorRepository.findByUserId(doctorId).orElseGet(DoctorProfile::new);
        profile.setUserId(doctorId); profile.setFullName(request.fullName().trim()); profile.setSpecialty(request.specialty().trim()); profile.setDegrees(request.degrees()); profile.setYearsExperience(request.yearsExperience()); profile.setBio(request.bio()); profile.setActive(true); profile.setUpdatedAt(Instant.now());
        return doctorRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public DoctorDashboardResponse dashboard(Long doctorId) {
        return new DoctorDashboardResponse(diseaseRepository.countByActiveTrue(), diseaseRepository.countByActiveTrueAndDoctorRequiredTrue(), requestRepository.countByStatus("PENDING_ASSIGNMENT") + requestRepository.countByStatus("ASSIGNED"), requestRepository.countByStatus("IN_REVIEW"), requestRepository.countByStatus("NEED_MORE_INFO"), requestRepository.countByStatus("COMPLETED"), requestRepository.countByStatus("REJECTED"), requestRepository.countByAssignedDoctorId(doctorId), doctorRepository.findByUserId(doctorId).map(DoctorProfile::isOnline).orElse(false));
    }

    @Transactional
    public DoctorProfile heartbeat(Long doctorId) {
        DoctorProfile profile = doctorRepository.findByUserId(doctorId).orElseThrow(() -> new IllegalArgumentException("Chưa có hồ sơ bác sĩ."));
        profile.setLastSeenAt(Instant.now()); profile.setUpdatedAt(Instant.now()); return profile;
    }

    @Transactional
    public DiseaseResponse updatePolicy(Long id, DiseasePolicyUpdateRequest request, Long doctorId) {
        Disease disease = diseaseRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bệnh lý."));
        DoctorProfile actor = doctorRepository.findByUserId(doctorId).orElseThrow(() -> new IllegalArgumentException("Chưa có hồ sơ bác sĩ."));
        if (disease.getSpecialty() != null && !disease.getSpecialty().isBlank() && !disease.getSpecialty().equalsIgnoreCase(actor.getSpecialty())) throw new IllegalArgumentException("Bác sĩ không thuộc chuyên khoa được phân quyền cho bệnh lý này.");
        String before = snapshot(disease);
        disease.setSeverity(request.severity().trim().toUpperCase(Locale.ROOT));
        if (!List.of("LOW", "MODERATE", "HIGH", "CRITICAL").contains(disease.getSeverity())) throw new IllegalArgumentException("Mức độ không hợp lệ.");
        disease.setDoctorRequired(request.doctorRequired()); disease.setRoadmapConfirmationRequired(request.roadmapConfirmationRequired()); disease.setAiAllowed(request.aiAllowed()); disease.setPriority(request.priority()); disease.setSpecialInstructions(request.specialInstructions()); disease.setUpdatedBy(doctorId); disease.setUpdatedAt(Instant.now());
        Disease saved = diseaseRepository.saveAndFlush(disease);
        policyAuditRepository.save(new DiseasePolicyAudit(id, policyAuditRepository.countByDiseaseId(id) + 1, doctorId, request.reason(), before, snapshot(saved)));
        return DiseaseResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<DiseasePolicyAudit> policyHistory(Long diseaseId) {
        if (!diseaseRepository.existsById(diseaseId)) throw new IllegalArgumentException("Không tìm thấy bệnh lý.");
        return policyAuditRepository.findTop50ByDiseaseIdOrderByCreatedAtDesc(diseaseId);
    }

    @Transactional(readOnly = true)
    public List<DoctorReviewRequestResponse> requests(Long doctorId, String status) {
        List<DoctorReviewRequest> rows = status == null || status.isBlank() ? requestRepository.findAllByAssignedDoctorId(doctorId, Sort.by(Sort.Direction.ASC, "createdAt")) : requestRepository.findAllByStatus(status.trim().toUpperCase(Locale.ROOT), Sort.by(Sort.Direction.ASC, "createdAt"));
        return rows.stream().filter(r -> doctorId.equals(r.getAssignedDoctorId())).map(responseMapper::toResponse).toList();
    }

    @Transactional
    public DoctorReviewRequestResponse decide(Long requestId, Long doctorId, DoctorReviewDecisionRequest command) {
        DoctorReviewRequest request = requestRepository.findByIdForUpdate(requestId).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu review."));
        if (!doctorId.equals(request.getAssignedDoctorId())) throw new IllegalArgumentException("Yêu cầu chưa được phân công cho bác sĩ này.");
        String action = command.action().trim().toUpperCase(Locale.ROOT);
        if (!List.of("APPROVE", "REJECT", "NEED_MORE_INFO", "REQUEST_REVISION").contains(action)) throw new IllegalArgumentException("Thao tác review không hợp lệ.");
        if (List.of("REJECT", "NEED_MORE_INFO", "REQUEST_REVISION").contains(action) && (command.note() == null || command.note().isBlank())) throw new IllegalArgumentException("Cần ghi nhận xét cho thao tác này.");
        if (!DECIDABLE_STATUSES.contains(request.getStatus())) throw new IllegalArgumentException("Yêu cầu đã kết thúc hoặc chưa sẵn sàng, không thể ra quyết định.");
        String status = switch (action) {
            case "APPROVE" -> "COMPLETED";
            case "REJECT" -> "REJECTED";
            case "REQUEST_REVISION" -> "REVISION_REQUESTED";
            default -> "NEED_MORE_INFO";
        };
        request.setStatus(status);
        // NEED_MORE_INFO vẫn đang mở (chờ người dùng bổ sung) nên chưa có thời điểm kết thúc.
        request.setCompletedAt("NEED_MORE_INFO".equals(status) ? null : Instant.now());
        requestRepository.save(request); reviewRepository.saveAndFlush(new DoctorReview(requestId, doctorId, action, command.note(), request.getPolicyVersion()));
        return responseMapper.toResponse(request);
    }

    @Transactional
    public DoctorReviewRequestResponse startReview(Long requestId, Long doctorId) {
        DoctorReviewRequest request = requestRepository.findByIdForUpdate(requestId).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu review."));
        if (!doctorId.equals(request.getAssignedDoctorId())) throw new IllegalArgumentException("Yêu cầu chưa được phân công cho bác sĩ này.");
        if (!List.of("ASSIGNED", "PENDING_ASSIGNMENT").contains(request.getStatus())) throw new IllegalArgumentException("Yêu cầu không còn ở trạng thái chờ kiểm tra.");
        request.setStatus("IN_REVIEW");
        return responseMapper.toResponse(requestRepository.save(request));
    }

    private String snapshot(Disease d) { try { return objectMapper.writeValueAsString(new Object[]{d.getSeverity(), d.isDoctorRequired(), d.isRoadmapConfirmationRequired(), d.isAiAllowed(), d.getPriority(), d.getSpecialInstructions()}); } catch (JsonProcessingException e) { throw new IllegalStateException("Không lưu được lịch sử chính sách.", e); } }
}
