package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapSlotRequest;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RoadmapLifecycleServiceTest {
    private final UserProfileRepository profileRepository = mock(UserProfileRepository.class);
    private final RoadmapRecordRepository roadmapRepository = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slotRepository = mock(RoadmapPlanSlotRepository.class);
    private final RoadmapPreviewService previewService = mock(RoadmapPreviewService.class);
    private final RoadmapLifecycleService service = new RoadmapLifecycleService(
            profileRepository, roadmapRepository, previewService, slotRepository, new ObjectMapper());
    private final Long userId = 41L;

    @BeforeEach
    void authenticate() {
        User user = new User();
        user.setUserId(userId);
        user.setUsername("member@gmail.com");
        user.setRole(Role.ROLE_USER);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, "token", user.getAuthorities()));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void activationArchivesPreviousPlanAndCreatesNextVersionFromOwnedPreview() {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setConsent(true);
        profile.setHeightCm(170.0);
        profile.setWeightKg(65.0);
        when(profileRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(profile));
        when(previewService.selectWithSchedule("preview-id", userId, profile.getUpdatedAt(), 1))
                .thenReturn(new RoadmapPreviewService.Selection(
                        new GeminiRoadmapResponse("Plan 2", "Overview", List.of("Week 1", "Week 2"),
                                List.of("Stop if uncomfortable"), "gemini"),
                        List.of(new RoadmapSlotRequest(1, "MORNING", java.time.LocalTime.of(6, 0),
                                java.time.LocalTime.of(7, 0), "RUNNING", "Chạy nhẹ"))));

        RoadmapRecord previous = new RoadmapRecord();
        previous.setId(8L);
        previous.setUserId(userId);
        previous.setTitle("Plan 1");
        previous.setStatus("ACTIVE");
        previous.setVersionNumber(1);
        when(roadmapRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)).thenReturn(Optional.of(previous));
        when(roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE"))
                .thenReturn(Optional.of(previous));
        when(roadmapRepository.countByUserId(userId)).thenReturn(1L);
        when(roadmapRepository.save(any(RoadmapRecord.class))).thenAnswer(invocation -> {
            RoadmapRecord saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(9L);
            return saved;
        });

        var result = service.activate("preview-id", 1);

        assertThat(previous.getStatus()).isEqualTo("ARCHIVED");
        assertThat(result.id()).isEqualTo(9L);
        assertThat(result.versionNumber()).isEqualTo(2);
        assertThat(result.previousRoadmapId()).isEqualTo(8L);
        assertThat(result.durationWeeks()).isEqualTo(2);
        assertThat(result.status()).isEqualTo("ACTIVE");
        assertThat(result.changeReason()).isEqualTo("USER_CONFIRMED_NEW_PLAN");
        assertThat(result.promptVersion()).isEqualTo(GeminiCoachService.PROMPT_VERSION);
        assertThat(result.schemaVersion()).isEqualTo(GeminiCoachService.SCHEMA_VERSION);
        verify(profileRepository).findByUserIdForUpdate(userId);
        verify(roadmapRepository).save(previous);
        verify(roadmapRepository).save(argThat(record -> record.getId().equals(9L)
                && record.getUserId().equals(userId) && record.getVersionNumber() == 2));
        verify(slotRepository).saveAll(argThat((Iterable<health_assistant.module.coach.entity.RoadmapPlanSlot> slots) -> {
            var materialized = java.util.stream.StreamSupport.stream(slots.spliterator(), false).toList();
            return materialized.size() == 2 && materialized.get(0).getDurationMinutes() == 60
                    && materialized.get(1).getDayIndex() - materialized.get(0).getDayIndex() == 7;
        }));
    }
}
