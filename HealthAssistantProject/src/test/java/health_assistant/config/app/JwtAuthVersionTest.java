package health_assistant.config.app;

import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtAuthVersionTest {
    @Test
    void passwordResetVersionChangeRevokesPreviouslyIssuedJwt() {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secretKey", "test-only-signing-key-must-be-at-least-32-characters");
        ReflectionTestUtils.setField(service, "jwtExpiration", 3_600_000L);
        User user = new User(); user.setUsername("verified@example.test"); user.setEnable(true);
        user.setEmailVerified(true); user.setRole(Role.ROLE_USER); user.setAuthVersion(0);

        String token = service.generateToken(user);
        assertTrue(service.isTokenValid(token, user));

        user.setAuthVersion(1);
        assertFalse(service.isTokenValid(token, user));
    }
}
