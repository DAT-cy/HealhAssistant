package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.entity.PlanAdjustment;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.PlanAdjustmentRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.entity.DailyCheckin;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PlanAdjustmentServiceTest {
    private final PlanAdjustmentRepository adjustmentRepository = mock(PlanAdjustmentRepository.class);
    private final RoadmapRecordRepository roadmapRepository = mock(RoadmapRecordRepository.class);
    private final DailyCheckinRepository checkinRepository = mock(DailyCheckinRepository.class);
    private final UserProfileRepository profileRepository = mock(UserProfileRepository.class);
    private final RoadmapLifecycleService lifecycleService = mock(RoadmapLifecycleService.class);
    private final PlanAdjustmentService service = new PlanAdjustmentService(adjustmentRepository, roadmapRepository,
            checkinRepository, profileRepository, lifecycleService, new ObjectMapper());
    private final Long userId = 74L;
    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

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
    void doesNotCreateAdjustmentWhenRecentCheckinsDoNotShowRepeatedLowReadiness() {
        UserProfile profile = profile();
        RoadmapRecord roadmap = roadmap();
        when(profileRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(profile));
        when(roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE"))
                .thenReturn(Optional.of(roadmap));
        when(adjustmentRepository.findFirstByUserIdAndRoadmapIdAndStatusOrderByCreatedAtDesc(
                userId, roadmap.getId(), "PROPOSED")).thenReturn(Optional.empty());
        when(checkinRepository.findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(anyLong(), any(), any()))
                .thenReturn(List.of(checkin(today.minusDays(1), 3, 2)));

        var result = service.evaluate();

        assertThat(result.proposalCreated()).isFalse();
        assertThat(result.proposal()).isNull();
        verify(adjustmentRepository, never()).save(any());
        verify(roadmapRepository, never()).save(any());
    }

    @Test
    void proposesRecoveryWeekFromRepeatedCheckinsWithoutChangingActivePlan() {
        UserProfile profile = profile();
        RoadmapRecord roadmap = roadmap();
        when(profileRepository.findByUserIdForUpdate(userId)).thenReturn(Optional.of(profile));
        when(roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE"))
                .thenReturn(Optional.of(roadmap));
        when(adjustmentRepository.findFirstByUserIdAndRoadmapIdAndStatusOrderByCreatedAtDesc(
                userId, roadmap.getId(), "PROPOSED")).thenReturn(Optional.empty());
        when(checkinRepository.findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(anyLong(), any(), any()))
                .thenReturn(List.of(checkin(today.minusDays(3), 2, 4), checkin(today.minusDays(1), 1, 4)));
        when(adjustmentRepository.save(any(PlanAdjustment.class))).thenAnswer(invocation -> {
            PlanAdjustment saved = invocation.getArgument(0);
            saved.setId(18L);
            return saved;
        });

        var result = service.evaluate();

        assertThat(result.proposalCreated()).isTrue();
        assertThat(result.proposal().id()).isEqualTo(18L);
        assertThat(result.proposal().status()).isEqualTo("PROPOSED");
        assertThat(result.proposal().reason()).contains("2 check-in");
        assertThat(result.proposal().proposedChanges().path("baseRoadmapId").asLong()).isEqualTo(6L);
        assertThat(result.proposal().proposedChanges().path("checkinDates").size()).isEqualTo(2);
        assertThat(result.proposal().proposedChanges().path("currentWeeklyPlan").get(1).asText())
                .isEqualTo("Week 2");
        assertThat(result.proposal().proposedChanges().path("proposedWeeklyPlan").get(1).asText())
                .contains("giảm tải");
        assertThat(roadmap.getStatus()).isEqualTo("ACTIVE");
        verify(roadmapRepository, never()).save(any());
    }

    private UserProfile profile() {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setConsent(true);
        return profile;
    }

    private RoadmapRecord roadmap() {
        RoadmapRecord roadmap = new RoadmapRecord();
        roadmap.setId(6L);
        roadmap.setUserId(userId);
        roadmap.setTitle("My plan");
        roadmap.setStatus("ACTIVE");
        roadmap.setStartDate(today.minusDays(10));
        roadmap.setDurationWeeks(3);
        roadmap.setVersionNumber(1);
        roadmap.setWeeklyPlan("[\"Week 1\",\"Week 2\",\"Week 3\"]");
        roadmap.setSafetyNotes("[\"Stop if uncomfortable\"]");
        roadmap.setCreatedAt(Instant.now());
        return roadmap;
    }

    private DailyCheckin checkin(LocalDate date, Integer energy, Integer fatigue) {
        DailyCheckin checkin = new DailyCheckin();
        checkin.setCheckInDate(date);
        checkin.setEnergyLevel(energy);
        checkin.setFatigueLevel(fatigue);
        return checkin;
    }
}
