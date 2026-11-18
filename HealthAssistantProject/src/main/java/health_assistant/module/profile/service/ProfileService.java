package health_assistant.module.profile.service;

import health_assistant.module.profile.dto.ProfileRequest;
import health_assistant.module.profile.dto.ProfileResponse;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.progress.entity.WeightLog;
import health_assistant.module.progress.repository.WeightLogRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private static final ZoneId USER_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final UserProfileRepository repository;
    private final WeightLogRepository weightLogRepository;

    @Transactional
    public ProfileResponse save(ProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = repository.findByUserId(userId).orElseGet(UserProfile::new);
        profile.setUserId(userId);
        profile.setGoal(blankToNull(request.goal()) == null ? "HEALTH_RECORD" : blankToNull(request.goal()));
        profile.setActivityLevel(blankToNull(request.activityLevel()) == null ? "UNSPECIFIED" : blankToNull(request.activityLevel()));
        if (request.gender() != null) {
            profile.setGender(request.gender());
        }
        profile.setAge(request.age());
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setRestrictions(blankToNull(request.restrictions()));
        profile.setPainAreas(blankToNull(request.painAreas()));
        profile.setDiseaseCodes(request.diseaseCodes()); profile.setSymptoms(request.symptoms()); profile.setMedicalHistory(request.medicalHistory()); profile.setFamilyHistory(request.familyHistory()); profile.setAllergies(request.allergies()); profile.setMedications(request.medications()); profile.setLifestyleNotes(request.lifestyleNotes()); profile.setSleepHours(request.sleepHours());
        profile.setHealthMetrics(request.healthMetrics());
        if (request.consent() != null) profile.setConsent(request.consent()); // không gửi thì giữ nguyên
        profile.setUpdatedAt(Instant.now());
        UserProfile savedProfile = repository.save(profile);
        if (request.weightKg() != null) {
            saveCurrentWeight(userId, request.weightKg());
        }
        return toResponse(savedProfile);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getMine() {
        return repository.findByUserId(SecurityUtils.getCurrentUserId())
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Chưa có hồ sơ tập luyện."));
    }

    @Transactional
    public ProfileResponse updateAvatar(String avatarUrl, String avatarPublicId) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Chưa có hồ sơ tập luyện."));
        profile.setAvatarUrl(avatarUrl);
        profile.setAvatarPublicId(avatarPublicId);
        profile.setUpdatedAt(Instant.now());
        return toResponse(repository.save(profile));
    }

    private ProfileResponse toResponse(UserProfile profile) {
        return new ProfileResponse(profile.getId(), profile.getUserId(), profile.getGoal(), profile.getActivityLevel(), profile.getGender(),
                profile.getAge(), profile.getHeightCm(), profile.getWeightKg(), profile.getRestrictions(),
                profile.getPainAreas(), profile.isConsent(), profile.getAvatarUrl(), profile.getDiseaseCodes(), profile.getSymptoms(), profile.getMedicalHistory(), profile.getFamilyHistory(), profile.getAllergies(), profile.getMedications(), profile.getLifestyleNotes(), profile.getSleepHours(), profile.getHealthMetrics());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void saveCurrentWeight(Long userId, Double weightKg) {
        LocalDate measuredOn = LocalDate.now(USER_ZONE);
        WeightLog log = weightLogRepository.findByUserIdAndMeasuredOn(userId, measuredOn).orElseGet(WeightLog::new);
        log.setUserId(userId);
        log.setMeasuredOn(measuredOn);
        log.setWeightKg(BigDecimal.valueOf(weightKg));
        if (log.getNote() == null || log.getNote().isBlank()) log.setNote("Từ hồ sơ sức khỏe");
        weightLogRepository.save(log);
    }
}
