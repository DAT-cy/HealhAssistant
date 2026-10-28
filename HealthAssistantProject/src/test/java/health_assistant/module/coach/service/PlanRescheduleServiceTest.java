package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.PlanReschedulePreviewRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PlanRescheduleServiceTest {
    private final PlanReschedulePreviewRepository previews = mock(PlanReschedulePreviewRepository.class);
    private final RoadmapRecordRepository roadmaps = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slots = mock(RoadmapPlanSlotRepository.class);
    private final ActivitySessionRepository activity = mock(ActivitySessionRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final FeatureAccessService access = mock(FeatureAccessService.class);
    private final RoadmapLifecycleService lifecycle = mock(RoadmapLifecycleService.class);
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final PlanRescheduleService service = new PlanRescheduleService(previews, roadmaps, slots, activity,
            profiles, access, lifecycle, gemini, new ObjectMapper());
    private final Long userId = 7L;
    private RoadmapRecord roadmap;

    @BeforeEach
    void setUp() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        roadmap = new RoadmapRecord();
        roadmap.setId(4L);
        roadmap.setUserId(userId);
        roadmap.setStatus("ACTIVE");
        roadmap.setStartDate(today.minusDays(2));
        roadmap.setDurationWeeks(4);
        roadmap.setVersionNumber(2);
        when(profiles.findByUserIdForUpdate(userId)).thenReturn(Optional.of(consentedProfile()));
        when(roadmaps.findByIdAndUserIdForUpdate(4L, userId)).thenReturn(Optional.of(roadmap));
        when(access.hasFeature(userId, PlanRescheduleService.PREMIUM_FEATURE)).thenReturn(false);
        when(gemini.isConfigured()).thenReturn(true);
    }

    @Test
    void freeAccountCannotCreateWholeNewRoadmapVersion() {
        var request = request("NEW_VERSION", LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));

        assertThatThrownBy(() -> service.preview(userId, request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Premium");
        verifyNoInteractions(gemini);
    }

    @Test
    void freeAccountCannotPreviewPastTheSevenDayWindow() {
        LocalDate target = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(7);

        assertThatThrownBy(() -> service.preview(userId, request("DAY", target)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("7 ngày");
        verifyNoInteractions(gemini);
    }

    @Test
    void freeAccountIsRateLimitedBeforeCallingAiForAnotherDailyPreview() {
        LocalDate target = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        when(previews.countByUserIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(eq(userId), any(), any())).thenReturn(1L);

        assertThatThrownBy(() -> service.preview(userId, request("DAY", target)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("bản xem trước AI");
        verifyNoInteractions(gemini);
    }

    private UserProfile consentedProfile() {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setConsent(true);
        profile.setGoal("Improve fitness");
        profile.setActivityLevel("Beginner");
        return profile;
    }

    private health_assistant.module.coach.dto.PlanRescheduleRequest request(String scope, LocalDate date) {
        return new health_assistant.module.coach.dto.PlanRescheduleRequest(4L, scope, date,
                "SINGLE_SLOT".equals(scope) ? 1L : null, null, null, null,
                null, null, null, null, null, null, null, null, "Schedule changed");
    }
}
