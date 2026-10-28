package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.entity.DailyAiReview;
import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.DailyAiReviewRepository;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyAiReviewServiceTest {
    private final DailyAiReviewRepository reviews = mock(DailyAiReviewRepository.class);
    private final RoadmapRecordRepository roadmaps = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slots = mock(RoadmapPlanSlotRepository.class);
    private final ActivitySessionRepository activity = mock(ActivitySessionRepository.class);
    private final WorkoutSessionRepository workouts = mock(WorkoutSessionRepository.class);
    private final MealLogRepository meals = mock(MealLogRepository.class);
    private final DailyCheckinRepository checkins = mock(DailyCheckinRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final RoadmapLifecycleService lifecycle = mock(RoadmapLifecycleService.class);
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final DailyAiReviewService service = new DailyAiReviewService(reviews, roadmaps, slots, activity, workouts,
            meals, checkins, profiles, lifecycle, gemini, new ObjectMapper());

    @Test
    void repeatedEvaluationForSameUserDateAndRoadmapReturnsTheStoredSnapshot() {
        Long userId = 22L;
        LocalDate date = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        RoadmapRecord roadmap = roadmap(userId, date);
        when(roadmaps.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")).thenReturn(Optional.of(roadmap));
        when(roadmaps.findByIdAndUserIdForUpdate(9L, userId)).thenReturn(Optional.of(roadmap));
        DailyAiReview existing = new DailyAiReview();
        existing.setId(44L);
        existing.setUserId(userId);
        existing.setRoadmapId(9L);
        existing.setReviewDate(date);
        existing.setStatus("NO_CHANGE");
        existing.setSnapshotJson("{}");
        existing.setReviewJson("""
                {"summary":"Stored review","achievedGoals":[],"incompleteActivities":[],"workloadAssessment":[],"missingData":[],"needsScheduleAdjustment":false,"reasons":[],"suggestions":[],"recommendation":"Keep current schedule","scheduleChanges":[]}
                """);
        existing.setSource("RULE_FALLBACK");
        when(reviews.findForDateAndRoadmapForUpdate(userId, date, 9L)).thenReturn(Optional.of(existing));

        var result = service.evaluate(userId, date);

        assertThat(result.id()).isEqualTo(44L);
        assertThat(result.summary()).isEqualTo("Stored review");
        verifyNoInteractions(gemini, slots, activity, workouts, meals, checkins);
        verify(reviews, never()).save(any());
    }

    @Test
    void fallbackReviewReportsMissingInputsAndDoesNotInventMealsOrActivities() {
        Long userId = 22L;
        LocalDate date = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        RoadmapRecord roadmap = roadmap(userId, date);
        when(roadmaps.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")).thenReturn(Optional.of(roadmap));
        when(roadmaps.findByIdAndUserIdForUpdate(9L, userId)).thenReturn(Optional.of(roadmap));
        when(reviews.findForDateAndRoadmapForUpdate(userId, date, 9L)).thenReturn(Optional.empty());
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        profile.setConsent(true);
        profile.setGoal("Build endurance");
        when(profiles.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(slots.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(9L, 0)).thenReturn(List.of(slot(7L, 0, "COMPLETED", "Chạy nhẹ"), slot(8L, 0, "SKIPPED", "Gym")));
        when(slots.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(9L)).thenReturn(List.of());
        when(activity.findAllByRoadmapIdAndUserIdOrderByStartedAtDesc(9L, userId)).thenReturn(List.of());
        when(meals.findAllForUserAndDate(eq(userId), eq(date), any(), any())).thenReturn(List.of());
        when(checkins.findByUserIdAndCheckInDate(userId, date)).thenReturn(Optional.empty());
        when(gemini.isConfigured()).thenReturn(false);
        when(reviews.save(any(DailyAiReview.class))).thenAnswer(invocation -> {
            DailyAiReview review = invocation.getArgument(0);
            review.setId(45L);
            return review;
        });

        var result = service.evaluate(userId, date);

        assertThat(result.status()).isEqualTo("NO_CHANGE");
        assertThat(result.source()).isEqualTo("RULE_FALLBACK");
        assertThat(result.achievedGoals()).anyMatch(item -> item.contains("Chạy nhẹ"));
        assertThat(result.incompleteActivities()).anyMatch(item -> item.contains("Gym"));
        assertThat(result.missingData()).anyMatch(item -> item.contains("bữa ăn"));
        assertThat(result.missingData()).anyMatch(item -> item.contains("check-in"));
        assertThat(result.confirmationRequired()).isFalse();
    }

    private RoadmapRecord roadmap(Long userId, LocalDate startDate) {
        RoadmapRecord roadmap = new RoadmapRecord();
        roadmap.setId(9L);
        roadmap.setUserId(userId);
        roadmap.setStatus("ACTIVE");
        roadmap.setStartDate(startDate);
        roadmap.setDurationWeeks(1);
        roadmap.setVersionNumber(1);
        roadmap.setTitle("Roadmap");
        roadmap.setOverview("Overview");
        roadmap.setWeeklyPlan("[\"Week one focus\"]");
        roadmap.setSafetyNotes("[]");
        return roadmap;
    }

    private RoadmapPlanSlot slot(Long id, int day, String status, String activityText) {
        RoadmapPlanSlot slot = new RoadmapPlanSlot();
        slot.setId(id);
        slot.setDayIndex(day);
        slot.setStatus(status);
        slot.setActivity(activityText);
        slot.setActivityType("RUNNING");
        slot.setSessionPeriod("MORNING");
        slot.setStartTime(LocalTime.of(6, 0));
        slot.setEndTime(LocalTime.of(7, 0));
        slot.setDurationMinutes(60);
        return slot;
    }
}
