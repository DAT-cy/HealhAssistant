package health_assistant.module.profile.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;

public record ProfileRequest(
        @NotBlank String goal,
        @NotBlank String activityLevel,
        @Pattern(regexp = "MALE|FEMALE", message = "Gender must be MALE or FEMALE") String gender,
        @Positive Integer age,
        @Positive Double heightCm,
        @Positive Double weightKg,
        String restrictions,
        String painAreas,
        @AssertTrue(message = "Bạn cần đồng ý với việc sử dụng dữ liệu tập luyện") boolean consent) {
}
