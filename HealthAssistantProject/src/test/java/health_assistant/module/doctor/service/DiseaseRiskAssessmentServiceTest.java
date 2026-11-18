package health_assistant.module.doctor.service;

import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.entity.DoctorProfile;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.doctor.repository.DoctorProfileRepository;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DiseaseRiskAssessmentServiceTest {
    private final DiseaseRepository diseases = mock(DiseaseRepository.class);
    private final DoctorProfileRepository doctors = mock(DoctorProfileRepository.class);
    private final DoctorReviewRequestRepository requests = mock(DoctorReviewRequestRepository.class);
    private final DiseaseRiskAssessmentService service = new DiseaseRiskAssessmentService(diseases, doctors, requests, new ObjectMapper());

    @Test
    void routesEmptyDiseaseSelectionToAutomaticRoadmap() {
        var result = service.evaluate(7L, null, List.of(), "profile");
        assertThat(result.decision()).isEqualTo("AUTO_ROADMAP");
        verifyNoInteractions(requests);
    }

    @Test
    void unknownDiseaseStaysAutomaticButMarkedUnverified() {
        when(diseases.findByCodeAndActiveTrue("UNKNOWN")).thenReturn(Optional.empty());
        var result = service.evaluate(7L, null, List.of("UNKNOWN"), "profile");
        assertThat(result.decision()).isEqualTo("AUTO_ROADMAP");
        assertThat(result.policyVersion()).isEqualTo("UNKNOWN_INPUT");
        verify(requests, never()).saveAndFlush(any());
    }

    @Test
    void routesCriticalDiseaseToUrgentMedicalAttentionWithoutDoctorQueueAssignment() {
        var disease = new health_assistant.module.doctor.entity.Disease();
        disease.setCode("CARDIAC-CRITICAL"); disease.setSeverity("CRITICAL"); disease.setAiAllowed(false);
        when(diseases.findByCodeAndActiveTrue("CARDIAC-CRITICAL")).thenReturn(Optional.of(disease));
        when(requests.saveAndFlush(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.evaluate(7L, null, List.of("CARDIAC-CRITICAL"), "profile");
        assertThat(result.decision()).isEqualTo("URGENT_MEDICAL_ATTENTION");
        verifyNoInteractions(doctors);
        verify(requests).saveAndFlush(argThat(request -> "URGENT_MEDICAL_ATTENTION".equals(request.getDecision()) && "HIGH".equals(request.getPriority())));
    }

    private static Disease disease(String code, String severity, boolean doctorRequired, String specialty) {
        var d = new Disease();
        d.setCode(code); d.setName("Bệnh " + code); d.setSeverity(severity); d.setDoctorRequired(doctorRequired); d.setSpecialty(specialty);
        d.setUpdatedAt(java.time.Instant.parse("2026-01-01T00:00:00Z"));
        return d;
    }

    private static DoctorProfile doctor(long userId, String specialty, boolean online) {
        var p = new DoctorProfile();
        p.setUserId(userId); p.setSpecialty(specialty); p.setActive(true);
        p.setLastSeenAt(online ? java.time.Instant.now() : java.time.Instant.now().minusSeconds(3600));
        return p;
    }

    @Test
    void riskSummaryDescribesDiseasesInsteadOfRepeatingReason() {
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease("HTN", "HIGH", true, "Tim mạch")));
        var assessment = service.assess(List.of("htn"));
        assertThat(assessment.decision()).isEqualTo("DOCTOR_REVIEW_REQUIRED");
        assertThat(assessment.riskSummary()).contains("Bệnh HTN (HTN)", "mức HIGH", "chuyên khoa Tim mạch").isNotEqualTo(assessment.reason());
    }

    @Test
    void codesAreSortedSoTheSameDiseaseSetMatchesLaterRequests() {
        when(diseases.findByCodeAndActiveTrue(anyString())).thenAnswer(inv -> Optional.of(disease(inv.<String>getArgument(0), "LOW", true, null)));
        assertThat(service.assess(List.of("B", "a", "B")).codesKey()).isEqualTo("A,B");
    }

    @Test
    void assignsToOnlineDoctorOfAnotherSpecialtyWhenNoSpecialistOnline() {
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease("HTN", "HIGH", true, "Tim mạch")));
        when(doctors.findAllByActiveTrueOrderByUpdatedAtAsc()).thenReturn(List.of(doctor(30L, "Cơ xương khớp", true)));
        when(requests.findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(anyLong(), anyString(), anyList())).thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service.submit(7L, null, service.assess(List.of("HTN")), "profile", "[]", "[]", null);
        verify(requests).saveAndFlush(argThat(r -> Long.valueOf(30L).equals(r.getAssignedDoctorId()) && "ASSIGNED".equals(r.getStatus())
                && "[]".equals(r.getAiPlanJson())));
    }

    @Test
    void assignsToOfflineSpecialistWhenNobodyIsOnline() {
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease("HTN", "HIGH", true, "Tim mạch")));
        when(doctors.findAllByActiveTrueOrderByUpdatedAtAsc()).thenReturn(List.of(doctor(30L, "Cơ xương khớp", false), doctor(31L, "Tim mạch", false)));
        when(requests.findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(anyLong(), anyString(), anyList())).thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service.submit(7L, null, service.assess(List.of("HTN")), "profile", null, null, null);
        verify(requests).saveAndFlush(argThat(r -> Long.valueOf(31L).equals(r.getAssignedDoctorId())));
    }

    @Test
    void revisionGoesBackToTheSameDoctor() {
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease("HTN", "HIGH", true, "Tim mạch")));
        when(doctors.findByUserId(40L)).thenReturn(Optional.of(doctor(40L, "Tim mạch", false)));
        when(requests.findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(anyLong(), anyString(), anyList())).thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var previous = new DoctorReviewRequest(); previous.setId(5L); previous.setAssignedDoctorId(40L);
        service.submit(7L, null, service.assess(List.of("HTN")), "profile", "[]", "[]", previous);
        verify(requests).saveAndFlush(argThat(r -> Long.valueOf(40L).equals(r.getAssignedDoctorId()) && Long.valueOf(5L).equals(r.getPreviousRequestId())));
    }

    @Test
    void approvedRequestOnlyMatchesSamePolicyVersion() {
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease("HTN", "HIGH", true, "Tim mạch")));
        var assessment = service.assess(List.of("HTN"));
        var approved = new DoctorReviewRequest(); approved.setPolicyVersion("HTN@old");
        when(requests.findFirstByUserIdAndDiseaseCodesAndStatusAndAppliedAtIsNullOrderByCompletedAtDesc(7L, "HTN", "COMPLETED")).thenReturn(Optional.of(approved));
        assertThat(service.findApprovedRequest(7L, assessment)).isEmpty();
        approved.setPolicyVersion(assessment.policyVersion());
        assertThat(service.findApprovedRequest(7L, assessment)).contains(approved);
    }

    @Test
    void userReplyReturnsRequestToAssignedDoctor() {
        var request = new DoctorReviewRequest(); request.setId(9L); request.setUserId(7L); request.setStatus("NEED_MORE_INFO"); request.setAssignedDoctorId(40L);
        when(requests.findByIdForUpdate(9L)).thenReturn(Optional.of(request));
        when(requests.save(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var updated = service.reply(7L, 9L, "  Tôi đang uống thuốc huyết áp  ");
        assertThat(updated.getStatus()).isEqualTo("ASSIGNED");
        assertThat(updated.getUserReply()).endsWith("Tôi đang uống thuốc huyết áp");
    }

    @Test
    void userCannotReplyWhenDoctorDidNotAskForMoreInfo() {
        var request = new DoctorReviewRequest(); request.setId(9L); request.setUserId(7L); request.setStatus("IN_REVIEW");
        when(requests.findByIdForUpdate(9L)).thenReturn(Optional.of(request));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.reply(7L, 9L, "x")).isInstanceOf(IllegalArgumentException.class);
    }
}
