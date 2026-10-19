package health_assistant.module.profile.dto;

public record ProfileResponse(Long id, Long userId, String goal, String activityLevel, String gender, Integer age,
                              Double heightCm, Double weightKg, String restrictions, String painAreas,
                              boolean consent, String avatarUrl) {
}
