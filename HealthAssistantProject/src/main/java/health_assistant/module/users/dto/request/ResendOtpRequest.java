package health_assistant.module.users.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResendOtpRequest(@NotBlank @Email @Size(max = 254) String email,
                               @NotBlank @Pattern(regexp = "REGISTER|RESET_PASSWORD") String purpose) {}
