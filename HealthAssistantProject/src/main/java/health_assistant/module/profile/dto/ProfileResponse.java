package health_assistant.module.profile.dto;

public record ProfileResponse(Long id, Long userId, String goal, String activityLevel, String gender, Integer age,
                              Double heightCm, Double weightKg, String restrictions, String painAreas,
                              boolean consent, String avatarUrl, String diseaseCodes, String symptoms,
                              String medicalHistory, String familyHistory, String allergies, String medications,
                              String lifestyleNotes, Double sleepHours, String healthMetrics) {
}
