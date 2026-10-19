package health_assistant.module.users.service.impl;

import health_assistant.config.app.JwtService;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.UserMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

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
    void signupReturnsAppJwtWithoutASecondLoginRequest() {
        when(userMapper.findByUsername("person@gmail.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("securepass1")).thenReturn("bcrypt-hash");
        when(jwtService.generateToken(any(User.class))).thenReturn("app-jwt");

        LoginResponse response = service.signUp(SignUpRequest.builder()
                .email(" Person@Gmail.com ")
                .password("securepass1")
                .build());

        assertThat(response.getToken()).isEqualTo("app-jwt");
        assertThat(response.getUsername()).isEqualTo("person@gmail.com");
        ArgumentCaptor<User> inserted = ArgumentCaptor.forClass(User.class);
        verify(userMapper).insertUser(inserted.capture());
        assertThat(inserted.getValue().getEmail()).isEqualTo("person@gmail.com");
        assertThat(inserted.getValue().getPassword()).isEqualTo("bcrypt-hash");
        verifyNoInteractions(authenticationManager);
    }
}
