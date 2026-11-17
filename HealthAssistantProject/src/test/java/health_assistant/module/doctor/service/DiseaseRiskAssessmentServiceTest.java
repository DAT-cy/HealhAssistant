package health_assistant.module.doctor.service;

import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.doctor.repository.DoctorProfileRepository;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
    void routesUnknownDiseaseToMoreInformationWithoutTreatingItAsSafe() {
        when(diseases.findByCodeAndActiveTrue("UNKNOWN")).thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(DoctorReviewRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.evaluate(7L, null, List.of("UNKNOWN"), "profile");
        assertThat(result.decision()).isEqualTo("NEED_MORE_INFORMATION");
        verify(requests).saveAndFlush(argThat(request -> "NEED_MORE_INFORMATION".equals(request.getDecision())));
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
}
