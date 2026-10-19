package health_assistant.module.users.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import health_assistant.config.app.JwtService;
import health_assistant.config.response.CommonException;
import health_assistant.config.response.ErrorCode;
import health_assistant.module.users.dto.request.GoogleLoginRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.entity.AuthIdentity;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.AuthIdentityRepository;
import health_assistant.module.users.repository.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class GoogleAuthService {
    private static final String PROVIDER = "GOOGLE";

    private final GoogleIdTokenVerifier verifier;
    private final AuthIdentityRepository identityRepository;
    private final UserMapper userMapper;
    private final JwtService jwtService;

    @Value("${google.oauth.client-ids:}")
    private String configuredClientIds;

    @Transactional
    public LoginResponse login(GoogleLoginRequest request) {
        if (configuredClientIds.isBlank()) {
            throw new CommonException(ErrorCode.GOOGLE_AUTH_NOT_CONFIGURED);
        }

        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(request.idToken());
        } catch (GeneralSecurityException | IOException exception) {
            throw new CommonException(ErrorCode.JWT_INVALID);
        }
        if (idToken == null) {
            throw new CommonException(ErrorCode.JWT_INVALID);
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String subject = payload.getSubject();
        String email = payload.getEmail();
        if (subject == null || email == null || !Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new CommonException(ErrorCode.JWT_INVALID);
        }

        String normalizedEmail = email.trim().toLowerCase(java.util.Locale.ROOT);
        AuthIdentity identity = identityRepository.findByProviderAndProviderSubject(PROVIDER, subject)
                .orElseGet(() -> provisionOrLinkAccount(subject, normalizedEmail, payload));

        identity.setProviderEmail(normalizedEmail);
        identity.setEmailVerified(true);
        identity.setLastLoginAt(Instant.now());
        identity = identityRepository.save(identity);
        User user = userMapper.findByUserId(identity.getUserId())
                .orElseThrow(() -> new CommonException(ErrorCode.ENTITY_NOT_FOUND));

        return LoginResponse.builder()
                .username(user.getUsername())
                .token(jwtService.generateToken(user))
                .role(user.getRole())
                .build();
    }

    private AuthIdentity provisionOrLinkAccount(String subject, String email, GoogleIdToken.Payload payload) {
        User user = userMapper.findByUsername(email).orElseGet(() -> {
            User created = new User();
            created.setUsername(email);
            created.setEmail(email);
            created.setDisplayName((String) payload.get("name"));
            created.setPassword(null);
            created.setRole(Role.ROLE_USER);
            created.setEnable(true);
            created.setIsDeleted(false);
            userMapper.insertUser(created);
            return created;
        });

        AuthIdentity identity = new AuthIdentity();
        identity.setUserId(user.getUserId());
        identity.setProvider(PROVIDER);
        identity.setProviderSubject(subject);
        identity.setProviderEmail(email);
        identity.setEmailVerified(true);
        return identityRepository.save(identity);
    }
}
