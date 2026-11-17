package health_assistant.module.doctor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.doctor.dto.DiseaseResponse;
import health_assistant.module.doctor.dto.RiskRoutingDecision;
import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.entity.DoctorProfile;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiseaseRiskAssessmentService {
    private final DiseaseRepository diseaseRepository;
    private final DoctorProfileRepository doctorRepository;
    private final DoctorReviewRequestRepository requestRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public RiskRoutingDecision evaluate(Long userId, Long roadmapId, List<String> requestedCodes, String fullText) {
        List<String> codes = requestedCodes == null ? List.of() : requestedCodes.stream().filter(Objects::nonNull).map(code -> code.trim().toUpperCase(Locale.ROOT)).filter(code -> !code.isBlank()).distinct().toList();
        if (codes.isEmpty()) return new RiskRoutingDecision("AUTO_ROADMAP", "Không có bệnh lý cần chuyển bác sĩ theo dữ liệu đã cung cấp.", null, "NONE");
        List<Disease> diseases = codes.stream().map(code -> diseaseRepository.findByCodeAndActiveTrue(code).orElse(null)).toList();
        List<String> unknownCodes = codes.stream().filter(code -> diseaseRepository.findByCodeAndActiveTrue(code).isEmpty()).toList();
        List<Disease> knownDiseases = diseases.stream().filter(Objects::nonNull).toList();
        String policyVersion = knownDiseases.stream().map(d -> d.getCode() + "@" + d.getUpdatedAt()).collect(Collectors.joining(","));
        String unknownNotice = unknownCodes.isEmpty() ? "" : " Bệnh lý ngoài danh mục được giữ ở trạng thái chưa xác thực; AI chỉ đưa khuyến nghị thận trọng và người dùng có thể gửi bác sĩ kiểm tra.";
        if (knownDiseases.isEmpty()) return new RiskRoutingDecision("AUTO_ROADMAP", "Không tìm thấy bệnh lý này trong kho nội bộ." + unknownNotice, null, "UNKNOWN_INPUT");
        boolean critical = knownDiseases.stream().anyMatch(d -> "CRITICAL".equals(d.getSeverity()));
        boolean requiresDoctor = knownDiseases.stream().anyMatch(d -> d.isDoctorRequired() || d.isRoadmapConfirmationRequired() || "HIGH".equals(d.getSeverity()));
        boolean combinedRisk = knownDiseases.size() > 1 && knownDiseases.stream().filter(d -> Set.of("MODERATE", "HIGH", "CRITICAL").contains(d.getSeverity())).count() >= 2;
        if (critical) return createRequest(userId, roadmapId, codes, "URGENT_MEDICAL_ATTENTION", "Có bệnh lý được cấu hình mức CRITICAL; cần liên hệ cơ sở y tế, không chờ bác sĩ online.", fullText, policyVersion);
        if (requiresDoctor || combinedRisk) return createRequest(userId, roadmapId, codes, "DOCTOR_REVIEW_REQUIRED", combinedRisk ? "Nhiều bệnh lý trung bình hoặc nặng xuất hiện đồng thời." : "Chính sách bệnh lý yêu cầu bác sĩ kiểm tra trước khi áp dụng lộ trình.", fullText, policyVersion);
        if (knownDiseases.stream().anyMatch(d -> !d.isAiAllowed())) return createRequest(userId, roadmapId, codes, "DOCTOR_REVIEW_REQUIRED", "Bệnh lý chưa được cho phép để AI tự xây dựng lộ trình.", fullText, policyVersion);
        return new RiskRoutingDecision("AUTO_ROADMAP", "Không kích hoạt điều kiện chuyển bác sĩ." + unknownNotice, null, policyVersion.isBlank() ? "UNKNOWN_INPUT" : policyVersion);
    }

    private RiskRoutingDecision createRequest(Long userId, Long roadmapId, List<String> codes, String decision, String reason, String fullText, String policyVersion) {
        List<String> openStatuses = List.of("PENDING_ASSIGNMENT", "ASSIGNED", "IN_REVIEW", "NEED_MORE_INFO");
        var existing = requestRepository.findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(userId, decision, openStatuses);
        if (existing.isPresent()) return new RiskRoutingDecision(decision, "Yêu cầu trước đó vẫn đang được xử lý.", existing.get().getId(), policyVersion);
        DoctorReviewRequest request = new DoctorReviewRequest();
        request.setUserId(userId); request.setRoadmapId(roadmapId); request.setDecision(decision); request.setReason(reason); request.setFullText(fullText); request.setDiseaseCodes(String.join(",", codes)); request.setPolicyVersion(policyVersion); request.setPriority("URGENT_MEDICAL_ATTENTION".equals(decision) ? "HIGH" : "NORMAL");
        request.setRiskSummary(reason);
        if (!"URGENT_MEDICAL_ATTENTION".equals(decision)) assign(request);
        DoctorReviewRequest saved = requestRepository.saveAndFlush(request);
        return new RiskRoutingDecision(decision, reason, saved.getId(), policyVersion);
    }

    private void assign(DoctorReviewRequest request) {
        Set<String> specialties = Arrays.stream(request.getDiseaseCodes().split(",")).map(code -> diseaseRepository.findByCodeAndActiveTrue(code).map(Disease::getSpecialty).orElse(null)).filter(Objects::nonNull).filter(value -> !value.isBlank()).map(String::toLowerCase).collect(Collectors.toSet());
        List<DoctorProfile> online = doctorRepository.findAllByActiveTrueOrderByUpdatedAtAsc().stream().filter(DoctorProfile::isOnline).filter(doctor -> specialties.isEmpty() || (doctor.getSpecialty() != null && specialties.contains(doctor.getSpecialty().toLowerCase(Locale.ROOT)))).toList();
        if (online.isEmpty()) { request.setStatus("PENDING_ASSIGNMENT"); return; }
        DoctorProfile selected = online.stream().min(Comparator.comparingLong(d -> requestRepository.countByAssignedDoctorId(d.getUserId()))).orElseThrow();
        request.setAssignedDoctorId(selected.getUserId()); request.setAssignedAt(Instant.now()); request.setStatus("ASSIGNED");
    }

    @Transactional(readOnly = true)
    public List<DiseaseResponse> diseases(String query, String severity, Boolean doctorRequired) {
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return diseaseRepository.findAllByActiveTrue(Sort.by(Sort.Direction.ASC, "priority")).stream().filter(d -> normalized.isBlank() || d.getName().toLowerCase(Locale.ROOT).contains(normalized) || d.getCode().toLowerCase(Locale.ROOT).contains(normalized)).filter(d -> severity == null || severity.isBlank() || severity.equalsIgnoreCase(d.getSeverity())).filter(d -> doctorRequired == null || doctorRequired == d.isDoctorRequired()).map(DiseaseResponse::from).toList();
    }
}
