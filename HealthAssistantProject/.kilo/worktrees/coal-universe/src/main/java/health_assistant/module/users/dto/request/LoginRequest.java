package health_assistant.module.users.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Username is required")
    @Schema(title = "username", example = "admin", description = "Username")
    private String username;

    @Schema(title = "password", example = "admin", description = "password")
    @NotBlank(message = "Password is required")
    private String password;
} 