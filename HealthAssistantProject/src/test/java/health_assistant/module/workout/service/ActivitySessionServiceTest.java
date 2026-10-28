package health_assistant.module.workout.service;

import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.workout.dto.ActivityLocationPoint;
import health_assistant.module.workout.dto.FinishActivitySessionRequest;
import health_assistant.module.workout.entity.ActivitySession;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ActivitySessionServiceTest {
    private final RoadmapRecordRepository roadmaps = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slots = mock(RoadmapPlanSlotRepository.class);
    private final ActivitySessionRepository sessions = mock(ActivitySessionRepository.class);
    private final ActivitySessionService service = new ActivitySessionService(roadmaps, slots, sessions);
    private final Long userId = 19L;
    private RoadmapRecord roadmap;
    private RoadmapPlanSlot slot;
    private ActivitySession session;

    @BeforeEach
    void setUp() {
        roadmap = new RoadmapRecord();
        roadmap.setId(3L);
        roadmap.setUserId(userId);
        roadmap.setStatus("ACTIVE");
        when(roadmaps.findByIdAndUserId(3L, userId)).thenReturn(Optional.of(roadmap));

        slot = new RoadmapPlanSlot();
        slot.setId(5L);
        slot.setRoadmap(roadmap);
        slot.setActivityType("RUNNING");
        slot.setActivity("Chạy bộ");
        slot.setStartTime(LocalTime.of(6, 0));
        slot.setEndTime(LocalTime.of(7, 0));
        slot.setDurationMinutes(60);
        slot.setStatus("UPCOMING");
        when(slots.findByIdAndRoadmapIdForUpdate(5L, 3L)).thenReturn(Optional.of(slot));
        when(slots.saveAndFlush(any(RoadmapPlanSlot.class))).thenAnswer(invocation -> invocation.getArgument(0));

        session = new ActivitySession();
        session.setId(7L);
        session.setUserId(userId);
        session.setRoadmapId(3L);
        session.setPlanSlotId(5L);
        session.setActivityType("RUNNING");
        session.setStatus("IN_PROGRESS");
        session.setStartedAt(Instant.now().minusSeconds(30));
        when(sessions.findByIdAndUserIdForUpdate(7L, userId)).thenReturn(Optional.of(session));
        when(sessions.findByIdAndUserId(7L, userId)).thenReturn(Optional.of(session));
        when(sessions.findByIdAndUserId(7L, userId)).thenReturn(Optional.of(session));
        when(sessions.saveAndFlush(any(ActivitySession.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createsOnlyOneActiveTrackingSessionForASlot() {
        when(sessions.findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc(5L, List.of("IN_PROGRESS", "PAUSED")))
                .thenReturn(Optional.of(session));

        var result = service.start(userId, 3L, 5L);

        assertThat(result.id()).isEqualTo(7L);
        verify(sessions, never()).saveAndFlush(any(ActivitySession.class));
    }

    @Test
    void rejectsStartingActivityForAnotherUsersRoadmap() {
        when(roadmaps.findByIdAndUserId(999L, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.start(userId, 999L, 5L)).isInstanceOf(EntityNotFoundException.class);
        verify(slots, never()).findByIdAndRoadmapIdForUpdate(any(), any());
    }

    @Test
    void rejectsUnreasonableGpsAndUsesOnlyExplicitManualDistanceFallback() {
        List<ActivityLocationPoint> teleport = List.of(
                new ActivityLocationPoint(session.getStartedAt().toEpochMilli() + 1000, 10, 106, 4),
                new ActivityLocationPoint(session.getStartedAt().toEpochMilli() + 2000, 10.01, 106.01, 4));

        var result = service.finish(userId, 7L, new FinishActivitySessionRequest(null, null, 1234,
                null, teleport, "Dữ liệu sensor"));

        assertThat(result.status()).isEqualTo("COMPLETED");
        assertThat(result.distanceMeters()).isNull();
        assertThat(result.distanceSource()).isEqualTo("UNAVAILABLE");
        assertThat(result.steps()).isEqualTo(1234);
        assertThat(result.stepsSource()).isEqualTo("SENSOR");
        assertThat(slot.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    void acceptsOnlyPlausibleGpsSegmentsAndComputesPace() {
        long start = session.getStartedAt().toEpochMilli();
        List<ActivityLocationPoint> points = List.of(
                new ActivityLocationPoint(start + 1000, 10, 106, 5),
                new ActivityLocationPoint(start + 11000, 10, 106.0005, 5));

        var result = service.finish(userId, 7L, new FinishActivitySessionRequest(600, null, 800,
                null, points, null));

        assertThat(result.distanceSource()).isEqualTo("GPS");
        assertThat(result.distanceMeters()).isBetween(50.0, 60.0);
        assertThat(result.paceSecondsPerKm()).isNotNull();
        assertThat(result.gpsSampleCount()).isEqualTo(2);
    }
}
