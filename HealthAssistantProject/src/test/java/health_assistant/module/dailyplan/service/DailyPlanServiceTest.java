package health_assistant.module.dailyplan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.dailyplan.entity.DailyPlan;
import health_assistant.module.dailyplan.repository.DailyPlanRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyPlanServiceTest {
    private final UserProfileRepository profileRepository = mock(UserProfileRepository.class);
    private final DailyPlanRepository dailyPlanRepository = mock(DailyPlanRepository.class);
    private final GeminiDailyPlanService geminiDailyPlanService = mock(GeminiDailyPlanService.class);
    private final DailyPlanService service = new DailyPlanService(profileRepository, dailyPlanRepository, new ObjectMapper(), geminiDailyPlanService);
    private final Long userId = 42L;
    private final LocalDate date = LocalDate.of(2026, 10, 12);

    @BeforeEach
    void resetRepositories() {
        reset(profileRepository, dailyPlanRepository, geminiDailyPlanService);
    }

    @Test
    void createsAndPersistsFallbackWhenThereIsNoPlanOrProfile() {
        when(dailyPlanRepository.findByUserIdAndPlanDate(userId, date)).thenReturn(Optional.empty());
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyPlanRepository.save(any(DailyPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyPlanResponse response = service.today(userId, date);

        assertThat(response.date()).isEqualTo(date.toString());
        assertThat(response.source()).isEqualTo("fallback-no-profile");
        assertThat(response.activities()).hasSize(3);
        assertThat(response.safetyNotes()).isNotEmpty();
        verify(dailyPlanRepository).save(any(DailyPlan.class));
    }

    @Test
    void returnsExistingPlanWithoutCreatingAnotherOne() {
        DailyPlan savedPlan = new DailyPlan();
        savedPlan.setPlanDate(date);
        savedPlan.setTitle("Đã lưu");
        savedPlan.setDuration("20 phút");
        savedPlan.setActivities("[\"Bài tập đã lưu\"]");
        savedPlan.setSafetyNotes("[\"Dừng nếu đau\"]");
        savedPlan.setSource("saved-template");
        when(dailyPlanRepository.findByUserIdAndPlanDate(userId, date)).thenReturn(Optional.of(savedPlan));

        DailyPlanResponse response = service.today(userId, date);

        assertThat(response.title()).isEqualTo("Đã lưu");
        assertThat(response.activities()).containsExactly("Bài tập đã lưu");
        assertThat(response.source()).isEqualTo("saved-template");
        verify(dailyPlanRepository, never()).save(any(DailyPlan.class));
        verify(profileRepository).findByUserId(userId);
        verifyNoInteractions(geminiDailyPlanService);
    }

    @Test
    void appliesSafetyPlanWhenProfileReportsPain() {
        UserProfile profile = new UserProfile();
        profile.setPainAreas("đầu gối");
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(dailyPlanRepository.findByUserIdAndPlanDate(userId, date)).thenReturn(Optional.empty());
        when(dailyPlanRepository.save(any(DailyPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DailyPlanResponse response = service.today(userId, date);

        assertThat(response.source()).isEqualTo("safety-rule");
        assertThat(response.title()).contains("nghỉ");
        verifyNoInteractions(geminiDailyPlanService);
    }

    @Test
    void createsAndPersistsGeminiPlanWhenProfileConsentsAndServiceIsConfigured() {
        UserProfile profile = new UserProfile();
        profile.setGoal("Tập nhẹ");
        profile.setActivityLevel("Mới bắt đầu");
        profile.setConsent(true);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(dailyPlanRepository.findByUserIdAndPlanDate(userId, date)).thenReturn(Optional.empty());
        when(dailyPlanRepository.save(any(DailyPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(geminiDailyPlanService.isConfigured()).thenReturn(true);
        when(geminiDailyPlanService.generate(profile)).thenReturn(Optional.of(
                new GeminiDailyPlanService.GeneratedDailyPlan("Buổi vận động nhẹ", "20 phút",
                        List.of("Khởi động", "Đi bộ tại chỗ"), List.of("Dừng nếu khó chịu."))));

        DailyPlanResponse response = service.today(userId, date);

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.title()).isEqualTo("Buổi vận động nhẹ");
        assertThat(response.activities()).containsExactly("Khởi động", "Đi bộ tại chỗ");
    }
}
