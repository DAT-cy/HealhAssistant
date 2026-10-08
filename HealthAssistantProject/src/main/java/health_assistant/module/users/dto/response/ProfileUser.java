package health_assistant.module.users.dto.response;

import health_assistant.module.users.entity.Role;
import lombok.*;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProfileUser {
    private String username;
    private Role role;
}
