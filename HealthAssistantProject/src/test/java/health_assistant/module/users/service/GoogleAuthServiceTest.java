package health_assistant.module.users.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import health_assistant.config.app.JwtService;
import health_assistant.config.app.GoogleOAuthConfiguration;
import health_assistant.config.response.CommonException;
import health_assistant.module.users.dto.request.GoogleLoginRequest;
import health_assistant.module.users.repository.AuthIdentityRepository;
import health_assistant.module.users.repository.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.assertThat;

class GoogleAuthServiceTest {
    private final GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
    private final AuthIdentityRepository identityRepository = mock(AuthIdentityRepository.class);
    private final UserMapper userMapper = mock(UserMapper.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final GoogleAuthService service = new GoogleAuthService(verifier, identityRepository, userMapper, jwtService);

    @Test
    void verifierCanInitializeWithoutGoogleCredentialsSoPasswordAuthStillStarts() {
        assertThat(new GoogleOAuthConfiguration().googleIdTokenVerifier("")).isNotNull();
    }

    @Test
    void rejectsGoogleSignInWhenTheServerHasNoAllowedAudiences() {
        ReflectionTestUtils.setField(service, "configuredClientIds", "");

        assertThatThrownBy(() -> service.login(new GoogleLoginRequest("id-token")))
                .isInstanceOf(CommonException.class);
        verifyNoInteractions(verifier, identityRepository, userMapper, jwtService);
    }
}
