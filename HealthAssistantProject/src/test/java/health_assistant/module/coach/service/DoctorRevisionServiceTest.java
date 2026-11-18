package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.doctor.dto.RiskRoutingDecision;
import health_assistant.module.doctor.entity.DoctorReview;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DoctorReviewRepository;
import health_assistant.module.doctor.repository.DoctorReviewRequestRepository;
import health_assistant.module.doctor.service.DiseaseRiskAssessmentService;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DoctorRevisionServiceTest {
    private final DoctorReviewRequestRepository requests = mock(DoctorReviewRequestRepository.class);
    private final DoctorReviewRepository reviews = mock(DoctorReviewRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final GeminiCoachService coach = mock(GeminiCoachService.class);
    private final DiseaseRiskAssessmentService risk = mock(DiseaseRiskAssessmentService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final DoctorRevisionService service = new DoctorRevisionService(requests, reviews, profiles, coach, risk, objectMapper);

    private DoctorReviewRequest previous(String status) {
        var r = new DoctorReviewRequest();
        r.setId(5L); r.setUserId(7L); r.setStatus(status); r.setDiseaseCodes("HTN"); r.setAssignedDoctorId(40L); r.setFullText("Tuổi: 40");
        r.setAiPlanJson("[{\"title\":\"A\",\"overview\":\"o\",\"weeklyPlan\":[\"t1\",\"t2\",\"t3\"],\"safetyNotes\":[\"s\"]}]");
        r.setScheduleJson("[]");
        when(requests.findById(5L)).thenReturn(Optional.of(r));
        return r;
    }

    @Test
    void regeneratesWithDoctorNoteAndSendsBackToSameRequestChain() {
        var prev = previous("REVISION_REQUESTED");
        when(reviews.findFirstByRequestIdOrderByCreatedAtDescIdDesc(5L)).thenReturn(Optional.of(new DoctorReview(5L, 40L, "REQUEST_REVISION", "Bỏ chạy bộ", null)));
        var profile = new UserProfile(); profile.setGoal("Giảm cân"); profile.setHeightCm(170.0); profile.setWeightKg(70.0);
        when(profiles.findByUserId(7L)).thenReturn(Optional.of(profile));
        var assessment = new DiseaseRiskAssessmentService.Assessment("DOCTOR_REVIEW_REQUIRED", "x", List.of("HTN"), "v", "s");
        when(risk.assess(List.of("HTN"))).thenReturn(assessment);
        var option = new GeminiRoadmapResponse("B", "o", List.of("1", "2", "3"), List.of("s"), "gemini");
        when(coach.planOptions(any())).thenReturn(List.of(option, option, option));
        when(risk.submit(eq(7L), isNull(), eq(assessment), anyString(), anyString(), anyString(), eq(prev)))
                .thenReturn(new RiskRoutingDecision("DOCTOR_REVIEW_REQUIRED", "x", 6L, "v"));

        assertThat(service.regenerate(5L)).contains(6L);

        ArgumentCaptor<GeminiRoadmapRequest> sent = ArgumentCaptor.forClass(GeminiRoadmapRequest.class);
        verify(coach).planOptions(sent.capture());
        assertThat(sent.getValue().restrictions()).startsWith("Bác sĩ yêu cầu điều chỉnh phương án trước: Bỏ chạy bộ");
        assertThat(sent.getValue().weeks()).isEqualTo(3);
        assertThat(sent.getValue().goal()).isEqualTo("Giảm cân");
    }

    @Test
    void ignoresRequestsThatAreNoLongerWaitingForRevision() {
        previous("COMPLETED");
        assertThat(service.regenerate(5L)).isEmpty();
        verifyNoInteractions(coach);
    }

    @Test
    void weeksDefaultToFourWhenPlanMissing() {
        assertThat(service.weeksOf(null)).isEqualTo(4);
        assertThat(service.weeksOf("not json")).isEqualTo(4);
    }
}
