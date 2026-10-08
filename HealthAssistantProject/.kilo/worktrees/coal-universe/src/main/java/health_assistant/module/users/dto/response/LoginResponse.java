package health_assistant.module.users.dto.response;

import health_assistant.module.users.entity.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class LoginResponse {
    private String token;
    private String username;
    private Role role;
} 