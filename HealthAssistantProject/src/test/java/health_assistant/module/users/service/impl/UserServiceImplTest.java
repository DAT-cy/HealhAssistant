package health_assistant.module.users.service.impl;

import health_assistant.config.app.JwtService;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.UserMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceImplTest {
    private final UserMapper userMapper = mock(UserMapper.class);
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final UserServiceImpl service = new UserServiceImpl(userMapper, authenticationManager, jwtService, passwordEncoder);

    @Test
    void seededAccountsAreMarkedAsVerifiedForBackwardCompatibility() {
        when(userMapper.countAdminUsers()).thenReturn(0);
        when(passwordEncoder.encode(anyString())).thenReturn("bcrypt-hash");
        service.initAdminUser();

        ArgumentCaptor<User> inserted = ArgumentCaptor.forClass(User.class);
        verify(userMapper, times(2)).insertUser(inserted.capture());
        assertThat(inserted.getAllValues()).allMatch(User::isEmailVerified);
        verifyNoInteractions(authenticationManager);
    }
}
