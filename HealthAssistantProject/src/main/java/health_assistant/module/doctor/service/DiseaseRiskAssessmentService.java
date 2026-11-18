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
    public static final String AUTO_ROADMAP = "AUTO_ROADMAP";
    public static final String DOCTOR_REVIEW_REQUIRED = "DOCTOR_REVIEW_REQUIRED";
    public static final String URGENT_MEDICAL_ATTENTION = "URGENT_MEDICAL_ATTENTION";

    /** Trạng thái còn đang chờ bác sĩ xử lý (chưa cho tạo yêu cầu mới). */
    public static final List<String> OPEN_STATUSES = List.of("PENDING_ASSIGNMENT", "ASSIGNED", "IN_REVIEW", "NEED_MORE_INFO");

    private final DiseaseRepository diseaseRepository;
    private final DoctorProfileRepository doctorRepository;
    private final DoctorReviewRequestRepository requestRepository;
    private final ObjectMapper objectMapper;

    /** Kết quả đánh giá rủi ro, chưa ghi gì vào DB. */
    public record Assessment(String decision, String reason, List<String> codes, String policyVersion, String riskSummary) {
        public boolean auto() { return AUTO_ROADMAP.equals(decision); }
        public boolean urgent() { return URGENT_MEDICAL_ATTENTION.equals(decision); }
        public String codesKey() { return String.join(",", codes); }
    }

    /** Giữ nguyên API cũ: đánh giá và tạo yêu cầu (không kèm phương án AI). */
    @Transactional
    public RiskRoutingDecision evaluate(Long userId, Long roadmapId, List<String> requestedCodes, String fullText) {
        Assessment assessment = assess(requestedCodes);
        if (assessment.auto()) return new RiskRoutingDecision(AUTO_ROADMAP, assessment.reason(), null, assessment.policyVersion());
        return submit(userId, roadmapId, assessment, fullText, null, null, null);
    }

    @Transactional(readOnly = true)
    public Assessment assess(List<String> requestedCodes) {
        List<String> codes = normalize(requestedCodes);
        if (codes.isEmpty()) return new Assessment(AUTO_ROADMAP, "Không có bệnh lý cần chuyển bác sĩ theo dữ liệu đã cung cấp.", codes, "NONE", null);
        Map<String, Disease> known = new LinkedHashMap<>();
        List<String> unknownCodes = new ArrayList<>();
        for (String code : codes) {
            diseaseRepository.findByCodeAndActiveTrue(code).ifPresentOrElse(d -> known.put(code, d), () -> unknownCodes.add(code));
        }
        List<Disease> knownDiseases = List.copyOf(known.values());
        String policyVersion = knownDiseases.stream().map(d -> d.getCode() + "@" + d.getUpdatedAt()).collect(Collectors.joining(","));
        String unknownNotice = unknownCodes.isEmpty() ? "" : " Bệnh lý ngoài danh mục được giữ ở trạng thái chưa xác thực; AI chỉ đưa khuyến nghị thận trọng và người dùng có thể gửi bác sĩ kiểm tra.";
        if (knownDiseases.isEmpty()) return new Assessment(AUTO_ROADMAP, "Không tìm thấy bệnh lý này trong kho nội bộ." + unknownNotice, codes, "UNKNOWN_INPUT", null);
        boolean critical = knownDiseases.stream().anyMatch(d -> "CRITICAL".equals(d.getSeverity()));
        boolean requiresDoctor = knownDiseases.stream().anyMatch(d -> d.isDoctorRequired() || d.isRoadmapConfirmationRequired() || "HIGH".equals(d.getSeverity()));
        boolean combinedRisk = knownDiseases.size() > 1 && knownDiseases.stream().filter(d -> Set.of("MODERATE", "HIGH", "CRITICAL").contains(d.getSeverity())).count() >= 2;
        String summary = riskSummary(knownDiseases, unknownCodes, combinedRisk);
        if (critical) return new Assessment(URGENT_MEDICAL_ATTENTION, "Có bệnh lý được cấu hình mức CRITICAL; cần liên hệ cơ sở y tế, không chờ bác sĩ online.", codes, policyVersion, summary);
        if (requiresDoctor || combinedRisk) return new Assessment(DOCTOR_REVIEW_REQUIRED, combinedRisk ? "Nhiều bệnh lý trung bình hoặc nặng xuất hiện đồng thời." : "Chính sách bệnh lý yêu cầu bác sĩ kiểm tra trước khi áp dụng lộ trình.", codes, policyVersion, summary);
        if (knownDiseases.stream().anyMatch(d -> !d.isAiAllowed())) return new Assessment(DOCTOR_REVIEW_REQUIRED, "Bệnh lý chưa được cho phép để AI tự xây dựng lộ trình.", codes, policyVersion, summary);
        return new Assessment(AUTO_ROADMAP, "Không kích hoạt điều kiện chuyển bác sĩ." + unknownNotice, codes, policyVersion.isBlank() ? "UNKNOWN_INPUT" : policyVersion, summary);
    }

    /** Yêu cầu đang mở cùng loại quyết định (chặn gửi trùng). */
    @Transactional(readOnly = true)
    public Optional<DoctorReviewRequest> findOpenRequest(Long userId, String decision) {
        return requestRepository.findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(userId, decision, OPEN_STATUSES);
    }

    /** Yêu cầu đã được bác sĩ duyệt, cùng bộ bệnh + phiên bản chính sách, chưa được kích hoạt. */
    @Transactional(readOnly = true)
    public Optional<DoctorReviewRequest> findApprovedRequest(Long userId, Assessment assessment) {
        return requestRepository.findFirstByUserIdAndDiseaseCodesAndStatusAndAppliedAtIsNullOrderByCompletedAtDesc(userId, assessment.codesKey(), "COMPLETED")
                .filter(r -> Objects.equals(r.getPolicyVersion(), assessment.policyVersion()));
    }

    /** Yêu cầu gần nhất bị bác sĩ "yêu cầu sửa" với cùng bộ bệnh. */
    @Transactional(readOnly = true)
    public Optional<DoctorReviewRequest> findLatestRevision(Long userId, Assessment assessment) {
        return requestRepository.findFirstByUserIdAndDiseaseCodesAndStatusOrderByCreatedAtDesc(userId, assessment.codesKey(), "REVISION_REQUESTED");
    }

    /** Tạo yêu cầu bác sĩ kiểm tra, kèm phương án AI (nếu có). Không tạo trùng khi còn yêu cầu đang mở. */
    @Transactional
    public RiskRoutingDecision submit(Long userId, Long roadmapId, Assessment assessment, String fullText,
                                      String aiPlanJson, String scheduleJson, DoctorReviewRequest previous) {
        var existing = findOpenRequest(userId, assessment.decision());
        if (existing.isPresent()) return new RiskRoutingDecision(assessment.decision(), "Yêu cầu trước đó vẫn đang được xử lý.", existing.get().getId(), assessment.policyVersion());
        DoctorReviewRequest request = new DoctorReviewRequest();
        request.setUserId(userId); request.setRoadmapId(roadmapId); request.setDecision(assessment.decision()); request.setReason(assessment.reason()); request.setFullText(fullText);
        request.setDiseaseCodes(assessment.codesKey()); request.setPolicyVersion(assessment.policyVersion());
        request.setPriority(assessment.urgent() ? "HIGH" : "NORMAL");
        request.setRiskSummary(assessment.riskSummary());
        request.setAiPlanJson(aiPlanJson); request.setScheduleJson(scheduleJson);
        if (previous != null) request.setPreviousRequestId(previous.getId());
        if (!assessment.urgent()) {
            Long sameDoctor = previous == null ? null : previous.getAssignedDoctorId();
            boolean sameDoctorActive = sameDoctor != null && doctorRepository.findByUserId(sameDoctor).map(DoctorProfile::isActive).orElse(false);
            if (sameDoctorActive) assignTo(request, sameDoctor); else assign(request);
        }
        DoctorReviewRequest saved = requestRepository.saveAndFlush(request);
        return new RiskRoutingDecision(assessment.decision(), assessment.reason(), saved.getId(), assessment.policyVersion());
    }

    /** Đánh dấu phương án đã duyệt đã được kích hoạt thành lộ trình. */
    @Transactional
    public void markApplied(Long requestId, Long userId, Long roadmapId) {
        requestRepository.findByIdForUpdate(requestId).filter(r -> userId.equals(r.getUserId())).ifPresent(r -> {
            r.setAppliedAt(Instant.now()); r.setRoadmapId(roadmapId); requestRepository.save(r);
        });
    }

    /** Người dùng bổ sung thông tin khi bác sĩ chọn "Cần thêm thông tin" → yêu cầu quay lại hàng chờ bác sĩ. */
    @Transactional
    public DoctorReviewRequest reply(Long userId, Long requestId, String message) {
        DoctorReviewRequest request = requestRepository.findByIdForUpdate(requestId).filter(r -> userId.equals(r.getUserId()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu bác sĩ."));
        if (!"NEED_MORE_INFO".equals(request.getStatus())) throw new IllegalArgumentException("Yêu cầu này không cần bổ sung thông tin.");
        String text = message == null ? "" : message.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Nội dung bổ sung không được để trống.");
        String previous = request.getUserReply() == null ? "" : request.getUserReply() + "\n";
        request.setUserReply(previous + "[" + Instant.now() + "] " + text);
        if (request.getAssignedDoctorId() != null) { request.setStatus("ASSIGNED"); } else { assign(request); }
        return requestRepository.save(request);
    }

    /** Giao các yêu cầu đang chờ phân công cho bác sĩ vừa online (gọi từ heartbeat). */
    @Transactional
    public int assignPendingTo(Long doctorId) {
        DoctorProfile doctor = doctorRepository.findByUserId(doctorId).filter(DoctorProfile::isActive).orElse(null);
        if (doctor == null) return 0;
        int count = 0;
        for (DoctorReviewRequest request : requestRepository.findAllByStatus("PENDING_ASSIGNMENT", Sort.by(Sort.Direction.ASC, "createdAt"))) {
            if (request.getAssignedDoctorId() != null || URGENT_MEDICAL_ATTENTION.equals(request.getDecision())) continue;
            Set<String> specialties = specialtiesOf(request);
            if (!specialties.isEmpty() && !matches(doctor, specialties) && anyActiveSpecialist(specialties)) continue;
            assignTo(request, doctorId); requestRepository.save(request); count++;
        }
        return count;
    }

    /**
     * Phân công: ưu tiên bác sĩ online đúng chuyên khoa → online bất kỳ → đúng chuyên khoa (offline)
     * → bất kỳ bác sĩ đang hoạt động. Chọn người đang có ít yêu cầu mở nhất.
     */
    private void assign(DoctorReviewRequest request) {
        Set<String> specialties = specialtiesOf(request);
        List<DoctorProfile> active = doctorRepository.findAllByActiveTrueOrderByUpdatedAtAsc();
        List<DoctorProfile> online = active.stream().filter(DoctorProfile::isOnline).toList();
        List<DoctorProfile> candidates = firstNonEmpty(
                online.stream().filter(d -> specialties.isEmpty() || matches(d, specialties)).toList(),
                online,
                active.stream().filter(d -> !specialties.isEmpty() && matches(d, specialties)).toList(),
                active);
        if (candidates.isEmpty()) { request.setStatus("PENDING_ASSIGNMENT"); request.setAssignedDoctorId(null); return; }
        DoctorProfile selected = candidates.stream().min(Comparator.comparingLong(d -> requestRepository.countByAssignedDoctorIdAndStatusIn(d.getUserId(), OPEN_STATUSES))).orElseThrow();
        assignTo(request, selected.getUserId());
    }

    private void assignTo(DoctorReviewRequest request, Long doctorId) {
        request.setAssignedDoctorId(doctorId); request.setAssignedAt(Instant.now()); request.setStatus("ASSIGNED");
    }

    @SafeVarargs
    private static List<DoctorProfile> firstNonEmpty(List<DoctorProfile>... lists) {
        for (List<DoctorProfile> list : lists) if (!list.isEmpty()) return list;
        return List.of();
    }

    private Set<String> specialtiesOf(DoctorReviewRequest request) {
        if (request.getDiseaseCodes() == null || request.getDiseaseCodes().isBlank()) return Set.of();
        return Arrays.stream(request.getDiseaseCodes().split(",")).map(String::trim).filter(c -> !c.isEmpty())
                .map(code -> diseaseRepository.findByCodeAndActiveTrue(code).map(Disease::getSpecialty).orElse(null))
                .filter(Objects::nonNull).filter(value -> !value.isBlank()).map(v -> v.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
    }

    private boolean anyActiveSpecialist(Set<String> specialties) {
        return doctorRepository.findAllByActiveTrueOrderByUpdatedAtAsc().stream().anyMatch(d -> matches(d, specialties));
    }

    private static boolean matches(DoctorProfile doctor, Set<String> specialties) {
        return doctor.getSpecialty() != null && specialties.contains(doctor.getSpecialty().toLowerCase(Locale.ROOT));
    }

    private static List<String> normalize(List<String> requestedCodes) {
        if (requestedCodes == null) return List.of();
        return requestedCodes.stream().filter(Objects::nonNull).map(code -> code.trim().toUpperCase(Locale.ROOT)).filter(code -> !code.isBlank()).distinct().sorted().toList();
    }

    /** Tóm tắt rủi ro riêng cho bác sĩ (không lặp lại lý do chuyển). */
    static String riskSummary(List<Disease> known, List<String> unknownCodes, boolean combinedRisk) {
        List<String> parts = new ArrayList<>();
        for (Disease d : known) {
            StringBuilder line = new StringBuilder();
            line.append(d.getName() == null || d.getName().isBlank() ? d.getCode() : d.getName() + " (" + d.getCode() + ")");
            line.append(" – mức ").append(d.getSeverity());
            if (d.getSpecialty() != null && !d.getSpecialty().isBlank()) line.append(", chuyên khoa ").append(d.getSpecialty());
            if (d.isDoctorRequired()) line.append(", bắt buộc bác sĩ");
            if (!d.isAiAllowed()) line.append(", AI không được tự lập lộ trình");
            parts.add(line.toString());
        }
        if (!unknownCodes.isEmpty()) parts.add("Ngoài danh mục: " + String.join(", ", unknownCodes));
        if (combinedRisk) parts.add("Có từ 2 bệnh mức trung bình trở lên cùng lúc");
        return String.join("; ", parts);
    }

    @Transactional(readOnly = true)
    public List<DiseaseResponse> diseases(String query, String severity, Boolean doctorRequired) {
        String normalized = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return diseaseRepository.findAllByActiveTrue(Sort.by(Sort.Direction.ASC, "priority")).stream().filter(d -> normalized.isBlank() || d.getName().toLowerCase(Locale.ROOT).contains(normalized) || d.getCode().toLowerCase(Locale.ROOT).contains(normalized)).filter(d -> severity == null || severity.isBlank() || severity.equalsIgnoreCase(d.getSeverity())).filter(d -> doctorRequired == null || doctorRequired == d.isDoctorRequired()).map(DiseaseResponse::from).toList();
    }
}
