package health_assistant.module.profile.service;

import health_assistant.module.profile.dto.ProfileRequest;
import health_assistant.module.profile.dto.ProfileResponse;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ProfileService {
    private final UserProfileRepository repository;

    @Transactional
    public ProfileResponse save(ProfileRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = repository.findByUserId(userId).orElseGet(UserProfile::new);
        profile.setUserId(userId);
        profile.setGoal(request.goal().trim());
        profile.setActivityLevel(request.activityLevel().trim());
        profile.setAge(request.age());
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setRestrictions(request.restrictions());
        profile.setPainAreas(request.painAreas());
        profile.setConsent(request.consent());
        profile.setUpdatedAt(Instant.now());
        return toResponse(repository.save(profile));
    }

    @Transactional(readOnly = true)
    public ProfileResponse getMine() {
        return repository.findByUserId(SecurityUtils.getCurrentUserId())
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Chưa có hồ sơ tập luyện."));
    }

    private ProfileResponse toResponse(UserProfile profile) {
        return new ProfileResponse(profile.getId(), profile.getUserId(), profile.getGoal(), profile.getActivityLevel(),
                profile.getAge(), profile.getHeightCm(), profile.getWeightKg(), profile.getRestrictions(),
                profile.getPainAreas(), profile.isConsent());
    }
}
