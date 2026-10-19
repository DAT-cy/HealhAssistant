package health_assistant.module.progress.service;

import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.dto.DailyCheckinRequest;
import health_assistant.module.progress.dto.DailyCheckinSummaryResponse;
import health_assistant.module.progress.entity.DailyCheckin;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.module.progress.repository.WeightLogRepository;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DailyCheckinServiceTest {
    private final DailyCheckinRepository repository = mock(DailyCheckinRepository.class);
    private final WeightLogRepository weightLogRepository = mock(WeightLogRepository.class);
    private final UserProfileRepository profileRepository = mock(UserProfileRepository.class);
    private final DailyCheckinService service = new DailyCheckinService(repository, weightLogRepository, profileRepository);
    private final Long userId = 17L;

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
    void rejectsEmptyAndFutureCheckins() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DailyCheckinRequest empty = new DailyCheckinRequest(null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> service.save(today, empty))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("ít nhất một");
        assertThatThrownBy(() -> service.save(today.plusDays(1), new DailyCheckinRequest(
                null, 3, null, null, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("tương lai");
        verifyNoInteractions(repository, weightLogRepository, profileRepository);
    }

    @Test
    void upsertsOneCheckinAndKeepsWeightHistoryInExistingTrackingTable() {
        LocalDate date = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DailyCheckin existing = new DailyCheckin();
        existing.setId(4L);
        UserProfile profile = new UserProfile();
        when(repository.findByUserIdAndCheckInDate(userId, date)).thenReturn(Optional.of(existing));
        when(repository.save(any(DailyCheckin.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(weightLogRepository.findByUserIdAndMeasuredOn(userId, date)).thenReturn(Optional.empty());
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        var response = service.save(date, new DailyCheckinRequest(
                new BigDecimal("64.25"), 4, new BigDecimal("7.50"), 4, 2,
                "GOOD", "Đi bộ 20 phút", null));

        assertThat(response.id()).isEqualTo(4L);
        assertThat(response.energyLevel()).isEqualTo(4);
        assertThat(profile.getWeightKg()).isEqualTo(64.25);
        verify(repository).save(existing);
        verify(weightLogRepository).save(argThat(log -> log.getUserId().equals(userId)
                && log.getMeasuredOn().equals(date) && log.getWeightKg().compareTo(new BigDecimal("64.25")) == 0));
        verify(profileRepository).save(profile);
    }

    @Test
    void historicalCheckinDoesNotReplaceCurrentProfileWeight() {
        LocalDate date = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1);
        when(repository.findByUserIdAndCheckInDate(userId, date)).thenReturn(Optional.empty());
        when(repository.save(any(DailyCheckin.class))).thenAnswer(invocation -> {
            DailyCheckin saved = invocation.getArgument(0);
            saved.setId(8L);
            return saved;
        });
        when(weightLogRepository.findByUserIdAndMeasuredOn(userId, date)).thenReturn(Optional.empty());

        service.save(date, new DailyCheckinRequest(
                new BigDecimal("64.25"), null, null, null, null, null, null, null));

        verify(weightLogRepository).save(any());
        verifyNoInteractions(profileRepository);
    }

    @Test
    void computesSummaryFromOnlyRecordedValues() {
        LocalDate from = LocalDate.of(2026, 10, 12);
        LocalDate to = from.plusDays(6);
        DailyCheckin first = new DailyCheckin();
        first.setEnergyLevel(4);
        first.setSleepHours(new BigDecimal("7.00"));
        first.setWeightKg(new BigDecimal("65.00"));
        DailyCheckin second = new DailyCheckin();
        second.setEnergyLevel(2);
        second.setSleepHours(new BigDecimal("8.00"));
        second.setWeightKg(new BigDecimal("64.50"));
        when(repository.findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, from, to))
                .thenReturn(List.of(first, second));

        DailyCheckinSummaryResponse result = service.summary(from, to);

        assertThat(result.checkinCount()).isEqualTo(2);
        assertThat(result.averageEnergyLevel()).isEqualByComparingTo("3.00");
        assertThat(result.averageSleepHours()).isEqualByComparingTo("7.50");
        assertThat(result.firstWeightKg()).isEqualByComparingTo("65.00");
        assertThat(result.latestWeightKg()).isEqualByComparingTo("64.50");
        assertThat(result.weightChangeKg()).isEqualByComparingTo("-0.50");
        verify(repository).findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, from, to);
    }
}
