package health_assistant.module.profile.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ProfileRequest(
        String goal,
        String activityLevel,
        @Pattern(regexp = "MALE|FEMALE", message = "Gender must be MALE or FEMALE") String gender,
        @Positive Integer age,
        @Positive Double heightCm,
        @Positive Double weightKg,
        String restrictions,
        String painAreas,
        Boolean consent, // null = giữ nguyên lựa chọn đồng ý hiện tại
        @Size(max = 2000) String diseaseCodes,
        @Size(max = 5000) String symptoms,
        @Size(max = 5000) String medicalHistory,
        @Size(max = 5000) String familyHistory,
        @Size(max = 3000) String allergies,
        @Size(max = 3000) String medications,
        @Size(max = 5000) String lifestyleNotes,
        @Positive Double sleepHours,
        @Size(max = 5000) String healthMetrics) {
}
