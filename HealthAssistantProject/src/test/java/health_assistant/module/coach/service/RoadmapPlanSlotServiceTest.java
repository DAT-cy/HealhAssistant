package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.CompleteRoadmapSlotRequest;
import health_assistant.module.coach.dto.SkipRoadmapSlotRequest;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RoadmapPlanSlotServiceTest {
    private final RoadmapRecordRepository roadmapRepository = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slotRepository = mock(RoadmapPlanSlotRepository.class);
    private final RoadmapPlanSlotService service = new RoadmapPlanSlotService(roadmapRepository, slotRepository, new ObjectMapper());
    private final Long userId = 41L;
    private RoadmapRecord roadmap;
    private RoadmapPlanSlot slot;

    @BeforeEach
    void authenticateAndPrepare() {
        User user = new User();
        user.setUserId(userId);
        user.setUsername("member@example.com");
        user.setRole(Role.ROLE_USER);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, "token", user.getAuthorities()));

        roadmap = new RoadmapRecord();
        roadmap.setId(7L);
        roadmap.setUserId(userId);
        roadmap.setStatus("ACTIVE");
        roadmap.setStartDate(LocalDate.of(2026, 10, 26));
        roadmap.setDurationWeeks(4);
        when(roadmapRepository.findByIdAndUserId(7L, userId)).thenReturn(Optional.of(roadmap));

        slot = new RoadmapPlanSlot();
        slot.setId(15L);
        slot.setRoadmap(roadmap);
        slot.setDayIndex(0);
        slot.setSessionPeriod("MORNING");
        slot.setStartTime(LocalTime.of(6, 0));
        slot.setEndTime(LocalTime.of(7, 0));
        slot.setDurationMinutes(60);
        slot.setActivityType("RUNNING");
        slot.setActivity("Chạy nhẹ");
        slot.setStatus("UPCOMING");
        when(slotRepository.findByIdAndRoadmapIdForUpdate(15L, 7L)).thenReturn(Optional.of(slot));
        when(slotRepository.saveAndFlush(any(RoadmapPlanSlot.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void startingTwiceDoesNotChangeTheFirstStartedAt() {
        var first = service.start(7L, 15L);
        var firstStartedAt = first.startedAt();
        var second = service.start(7L, 15L);

        assertThat(first.status()).isEqualTo("IN_PROGRESS");
        assertThat(second.startedAt()).isEqualTo(firstStartedAt);
        verify(slotRepository, times(1)).saveAndFlush(slot);
    }

    @Test
    void repeatedCompletionIsIdempotentAndStoresTheUserResult() {
        service.start(7L, 15L);
        var completed = service.complete(7L, 15L, new CompleteRoadmapSlotRequest(42, "Hoàn thành đủ quãng đường"));
        var repeated = service.complete(7L, 15L, new CompleteRoadmapSlotRequest(10, "Gửi lại"));

        assertThat(completed.status()).isEqualTo("COMPLETED");
        assertThat(completed.actualDurationMinutes()).isEqualTo(42);
        assertThat(completed.notes()).isEqualTo("Hoàn thành đủ quãng đường");
        assertThat(repeated.actualDurationMinutes()).isEqualTo(42);
        verify(slotRepository, times(2)).saveAndFlush(slot);
    }

    @Test
    void skippingStoresReasonWithoutMarkingTheSlotCompleted() {
        var skipped = service.skip(7L, 15L, new SkipRoadmapSlotRequest("Thời tiết không phù hợp"));
        var repeated = service.skip(7L, 15L, new SkipRoadmapSlotRequest("Lý do thay đổi"));

        assertThat(skipped.status()).isEqualTo("SKIPPED");
        assertThat(skipped.completedAt()).isNull();
        assertThat(skipped.skipReason()).isEqualTo("Thời tiết không phù hợp");
        assertThat(repeated.skipReason()).isEqualTo("Thời tiết không phù hợp");
        verify(slotRepository, times(1)).saveAndFlush(slot);
    }

    @Test
    void cannotCompleteAnActivityAfterItWasSkipped() {
        service.skip(7L, 15L, new SkipRoadmapSlotRequest("Không khỏe"));

        assertThatThrownBy(() -> service.complete(7L, 15L, new CompleteRoadmapSlotRequest(null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("bỏ qua");
        verify(slotRepository, times(1)).saveAndFlush(slot);
    }

    @Test
    void rejectsSlotsFromRoadmapsNotOwnedByTheCurrentUser() {
        when(roadmapRepository.findByIdAndUserId(99L, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.start(99L, 15L)).isInstanceOf(EntityNotFoundException.class);
        verify(slotRepository, never()).findByIdAndRoadmapIdForUpdate(any(), any());
    }

    @Test
    void dayResponseIncludesWeeklyFocusAndSlotProgress() {
        roadmap.setWeeklyPlan("[\"Build endurance\",\"Recover\"]");
        roadmap.setSafetyNotes("[\"Stop if painful\"]");
        when(slotRepository.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(7L, 0)).thenReturn(java.util.List.of(slot));

        var day = service.day(7L, LocalDate.of(2026, 10, 26));

        assertThat(day.status()).isEqualTo("UPCOMING");
        assertThat(day.totalSlots()).isEqualTo(1);
        assertThat(day.expectedMinutes()).isEqualTo(60);
        assertThat(day.weeklyFocus()).isEqualTo("Build endurance");
        assertThat(day.safetyNotes()).containsExactly("Stop if painful");
    }

    @Test
    void rejectsDatesOutsideTheRoadmap() {
        assertThatThrownBy(() -> service.day(7L, LocalDate.of(2026, 10, 25)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ngoài thời lượng");
    }
}
