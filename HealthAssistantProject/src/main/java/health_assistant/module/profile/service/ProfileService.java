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
        profile.setGoal(request.goal().trim());
        profile.setActivityLevel(request.activityLevel().trim());
        if (request.gender() != null) {
            profile.setGender(request.gender());
        }
        profile.setAge(request.age());
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setRestrictions(request.restrictions());
        profile.setPainAreas(request.painAreas());
        profile.setConsent(request.consent());
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
                profile.getPainAreas(), profile.isConsent(), profile.getAvatarUrl());
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
