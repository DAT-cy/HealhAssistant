package health_assistant.module.progress.service;

import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.dto.DailyCheckinRequest;
import health_assistant.module.progress.dto.DailyCheckinResponse;
import health_assistant.module.progress.dto.DailyCheckinSummaryResponse;
import health_assistant.module.progress.entity.DailyCheckin;
import health_assistant.module.progress.entity.WeightLog;
import health_assistant.module.progress.repository.DailyCheckinRepository;
import health_assistant.module.progress.repository.WeightLogRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class DailyCheckinService {
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DailyCheckinRepository repository;
    private final WeightLogRepository weightLogRepository;
    private final UserProfileRepository profileRepository;

    @Transactional
    public DailyCheckinResponse save(LocalDate date, DailyCheckinRequest request) {
        if (date.isAfter(LocalDate.now(USER_ZONE))) {
            throw new IllegalArgumentException("Không thể ghi check-in cho ngày trong tương lai.");
        }
        if (!request.hasAnyValue()) {
            throw new IllegalArgumentException("Hãy nhập ít nhất một thông tin cho check-in.");
        }

        Long userId = SecurityUtils.getCurrentUserId();
        DailyCheckin checkin = repository.findByUserIdAndCheckInDate(userId, date)
                .orElseGet(DailyCheckin::new);
        checkin.setUserId(userId);
        checkin.setCheckInDate(date);
        checkin.setWeightKg(request.weightKg());
        checkin.setEnergyLevel(request.energyLevel());
        checkin.setSleepHours(request.sleepHours());
        checkin.setSleepQuality(request.sleepQuality());
        checkin.setFatigueLevel(request.fatigueLevel());
        checkin.setMood(blankToNull(request.mood()));
        checkin.setActivityNotes(blankToNull(request.activityNotes()));
        checkin.setNote(blankToNull(request.note()));

        DailyCheckinResponse response = toResponse(repository.save(checkin));
        if (request.weightKg() != null) {
            syncWeightLog(userId, date, request.weightKg());
            if (date.equals(LocalDate.now(USER_ZONE))) {
                profileRepository.findByUserId(userId).ifPresent(profile -> updateCurrentWeight(profile, request.weightKg()));
            }
        }
        return response;
    }

    @Transactional(readOnly = true)
    public DailyCheckinResponse getMine(LocalDate date) {
        return repository.findByUserIdAndCheckInDate(SecurityUtils.getCurrentUserId(), date)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Chưa có check-in cho ngày này."));
    }

    @Transactional(readOnly = true)
    public List<DailyCheckinResponse> listMine(LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        Long userId = SecurityUtils.getCurrentUserId();
        List<DailyCheckin> entries = from == null
                ? repository.findAllByUserIdOrderByCheckInDateAsc(userId)
                : repository.findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(userId, from, to);
        return entries.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DailyCheckinSummaryResponse summary(LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        if (from == null) throw new IllegalArgumentException("Cần truyền from và to để tổng hợp check-in.");
        List<DailyCheckin> entries = repository.findAllByUserIdAndCheckInDateBetweenOrderByCheckInDateAsc(
                SecurityUtils.getCurrentUserId(), from, to);
        BigDecimal firstWeight = firstWeight(entries);
        BigDecimal latestWeight = latestWeight(entries);
        BigDecimal weightChange = firstWeight == null || latestWeight == null
                ? null : latestWeight.subtract(firstWeight).setScale(2, RoundingMode.HALF_UP);
        return new DailyCheckinSummaryResponse(from, to, entries.size(),
                averageInteger(entries, DailyCheckin::getEnergyLevel), average(entries, DailyCheckin::getSleepHours),
                averageInteger(entries, DailyCheckin::getSleepQuality), averageInteger(entries, DailyCheckin::getFatigueLevel),
                firstWeight, latestWeight, weightChange);
    }

    @Transactional
    public void deleteMine(LocalDate date) {
        DailyCheckin checkin = repository.findByUserIdAndCheckInDate(SecurityUtils.getCurrentUserId(), date)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy check-in cho ngày này."));
        repository.delete(checkin);
    }

    private void syncWeightLog(Long userId, LocalDate date, BigDecimal weightKg) {
        WeightLog log = weightLogRepository.findByUserIdAndMeasuredOn(userId, date).orElseGet(WeightLog::new);
        log.setUserId(userId);
        log.setMeasuredOn(date);
        log.setWeightKg(weightKg);
        if (log.getNote() == null || log.getNote().isBlank()) log.setNote("Ghi nhận từ check-in");
        weightLogRepository.save(log);
    }

    private void updateCurrentWeight(UserProfile profile, BigDecimal weightKg) {
        profile.setWeightKg(weightKg.doubleValue());
        profile.setUpdatedAt(java.time.Instant.now());
        profileRepository.save(profile);
    }

    private void validatePeriod(LocalDate from, LocalDate to) {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Cần truyền đồng thời from và to để lọc khoảng ngày.");
        }
        if (from != null && to.isBefore(from)) {
            throw new IllegalArgumentException("Ngày to không được trước ngày from.");
        }
        if (from != null && from.isBefore(to.minusYears(2))) {
            throw new IllegalArgumentException("Khoảng ngày không được vượt quá 2 năm.");
        }
    }

    private BigDecimal average(List<DailyCheckin> entries, Function<DailyCheckin, BigDecimal> field) {
        List<BigDecimal> values = entries.stream().map(field).filter(value -> value != null).toList();
        if (values.isEmpty()) return null;
        BigDecimal total = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal averageInteger(List<DailyCheckin> entries, Function<DailyCheckin, Integer> field) {
        List<Integer> values = entries.stream().map(field).filter(value -> value != null).toList();
        if (values.isEmpty()) return null;
        return BigDecimal.valueOf(values.stream().mapToInt(Integer::intValue).average().orElseThrow())
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal firstWeight(List<DailyCheckin> entries) {
        return entries.stream().map(DailyCheckin::getWeightKg).filter(value -> value != null).findFirst().orElse(null);
    }

    private BigDecimal latestWeight(List<DailyCheckin> entries) {
        return entries.stream().map(DailyCheckin::getWeightKg).filter(value -> value != null)
                .reduce((first, second) -> second).orElse(null);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private DailyCheckinResponse toResponse(DailyCheckin checkin) {
        return new DailyCheckinResponse(checkin.getId(), checkin.getCheckInDate(), checkin.getWeightKg(),
                checkin.getEnergyLevel(), checkin.getSleepHours(), checkin.getSleepQuality(), checkin.getFatigueLevel(),
                checkin.getMood(), checkin.getActivityNotes(), checkin.getNote(), checkin.getCreatedAt(), checkin.getUpdatedAt());
    }
}
