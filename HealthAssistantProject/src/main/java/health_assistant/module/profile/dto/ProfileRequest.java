package health_assistant.module.profile.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;

public record ProfileRequest(
        @NotBlank String goal,
        @NotBlank String activityLevel,
        @Pattern(regexp = "MALE|FEMALE", message = "Gender must be MALE or FEMALE") String gender,
        @NotNull @Positive Integer age,
        @NotNull @Positive Double heightCm,
        @NotNull @Positive Double weightKg,
        @NotBlank String restrictions,
        @NotBlank String painAreas,
        @AssertTrue(message = "Bạn cần đồng ý với việc sử dụng dữ liệu tập luyện") boolean consent) {
}
