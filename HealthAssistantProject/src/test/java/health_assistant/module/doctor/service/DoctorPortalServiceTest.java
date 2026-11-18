package health_assistant.module.doctor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.doctor.dto.DoctorReviewDecisionRequest;
import health_assistant.module.doctor.entity.DoctorReview;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DoctorPortalServiceTest {
    private final DoctorProfileRepository doctors = mock(DoctorProfileRepository.class);
    private final DiseaseRepository diseases = mock(DiseaseRepository.class);
    private final DiseasePolicyAuditRepository audits = mock(DiseasePolicyAuditRepository.class);
    private final DoctorReviewRequestRepository requests = mock(DoctorReviewRequestRepository.class);
    private final DoctorReviewRepository reviews = mock(DoctorReviewRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final DoctorPortalService service = new DoctorPortalService(doctors, diseases, audits, requests, reviews, objectMapper,
            new DoctorReviewResponseMapper(reviews, objectMapper));

    private DoctorReviewRequest request(String status) {
        var r = new DoctorReviewRequest();
        r.setId(1L); r.setUserId(7L); r.setAssignedDoctorId(20L); r.setStatus(status); r.setDecision("DOCTOR_REVIEW_REQUIRED"); r.setReason("x");
        r.setAiPlanJson("[{\"title\":\"A\"}]");
        when(requests.findByIdForUpdate(1L)).thenReturn(Optional.of(r));
        return r;
    }

    @ParameterizedTest
    @CsvSource({"APPROVE,COMPLETED", "REJECT,REJECTED", "REQUEST_REVISION,REVISION_REQUESTED", "NEED_MORE_INFO,NEED_MORE_INFO"})
    void decisionMapsToStatus(String action, String expectedStatus) {
        request("IN_REVIEW");
        var saved = new DoctorReview(1L, 20L, action, "ghi chú", null);
        when(reviews.findFirstByRequestIdOrderByCreatedAtDescIdDesc(1L)).thenReturn(Optional.of(saved));
        var response = service.decide(1L, 20L, new DoctorReviewDecisionRequest(action, "ghi chú"));
        assertThat(response.status()).isEqualTo(expectedStatus);
        assertThat(response.doctorNote()).isEqualTo("ghi chú");
        assertThat(response.lastAction()).isEqualTo(action);
        assertThat(response.aiPlan().get(0).get("title").asText()).isEqualTo("A");
        if ("NEED_MORE_INFO".equals(expectedStatus)) assertThat(response.completedAt()).isNull();
        else assertThat(response.completedAt()).isNotNull();
    }

    @ParameterizedTest
    @CsvSource({"COMPLETED", "REJECTED", "REVISION_REQUESTED", "PENDING_ASSIGNMENT"})
    void cannotDecideOnFinishedOrUnassignedRequest(String status) {
        request(status);
        assertThatThrownBy(() -> service.decide(1L, 20L, new DoctorReviewDecisionRequest("APPROVE", null)))
                .isInstanceOf(IllegalArgumentException.class);
        verify(reviews, never()).saveAndFlush(any());
    }

    @Test
    void otherDoctorCannotDecide() {
        request("IN_REVIEW");
        assertThatThrownBy(() -> service.decide(1L, 99L, new DoctorReviewDecisionRequest("APPROVE", null)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
