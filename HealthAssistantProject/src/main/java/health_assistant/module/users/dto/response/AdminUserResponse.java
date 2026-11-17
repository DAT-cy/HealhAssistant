package health_assistant.module.users.dto.response;

import health_assistant.module.users.entity.Role;

import java.util.Date;

public record AdminUserResponse(Long id, String username, String email, String displayName,
                                Role role, boolean enabled, boolean emailVerified,
                                Date createdAt) {}
