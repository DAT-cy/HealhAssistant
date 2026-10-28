package health_assistant.module.workout.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.entity.WorkoutSession;
import health_assistant.module.workout.repository.ExerciseCatalogRepository;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GymWorkoutServicePremiumTest {
    private final ExerciseCatalogRepository exercises = mock(ExerciseCatalogRepository.class);
    private final WorkoutSessionRepository sessions = mock(WorkoutSessionRepository.class);
    private final RoadmapRecordRepository roadmaps = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slots = mock(RoadmapPlanSlotRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final CloudinaryUploadService imageValidator = mock(CloudinaryUploadService.class);
    private final FeatureAccessService access = mock(FeatureAccessService.class);
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final GymWorkoutService service = new GymWorkoutService(exercises, sessions, roadmaps, slots, profiles,
            imageValidator, access, gemini, new ObjectMapper());

    @Test
    void photoAnalysisChecksServerEntitlementBeforeValidatingOrCallingAi() {
        WorkoutSession session = new WorkoutSession();
        session.setId(5L);
        session.setUserId(12L);
        session.setStatus("IN_PROGRESS");
        when(sessions.findByIdAndUserIdForUpdate(5L, 12L)).thenReturn(Optional.of(session));
        doThrow(new AccessDeniedException("Premium required")).when(access).requireFeature(12L, GymWorkoutService.PREMIUM_FEATURE);

        assertThatThrownBy(() -> service.analyzePhoto(12L, 5L,
                new MockMultipartFile("file", "pose.jpg", "image/jpeg", new byte[] { 1 }), "back"))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(gemini);
        verify(imageValidator, never()).validateImageFile(any());
    }
}
