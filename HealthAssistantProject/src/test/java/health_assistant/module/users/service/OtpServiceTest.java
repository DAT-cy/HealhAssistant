package health_assistant.module.users.service;

import health_assistant.config.app.JwtService;
import health_assistant.module.users.dto.request.OtpVerifyRequest;
import health_assistant.module.users.dto.request.ResetPasswordRequest;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.entity.OtpChallenge;
import health_assistant.module.users.entity.PasswordResetGrant;
import health_assistant.module.users.repository.OtpChallengeRepository;
import health_assistant.module.users.repository.PasswordResetGrantRepository;
import health_assistant.module.users.repository.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {
    @Mock OtpChallengeRepository challenges;
    @Mock OtpRateLimitService rateLimiter;
    @Mock PasswordResetGrantRepository grants;
    @Mock UserMapper users;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwt;
    @Mock JavaMailSender mail;
    private OtpService service;

    @BeforeEach
    void setUp() {
        service = new OtpService(challenges, rateLimiter, grants, users, encoder, jwt, mail);
        ReflectionTestUtils.setField(service, "expiryMinutes", 5);
        ReflectionTestUtils.setField(service, "resendCooldownSeconds", 60);
        ReflectionTestUtils.setField(service, "maxAttempts", 5);
        ReflectionTestUtils.setField(service, "fromAddress", "health-assistant@example.test");
    }

    @Test
    void registrationSendsAHashedOtpAndDoesNotCreateUserBeforeVerification() {
        when(users.findByUsername("person@gmail.com")).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenAnswer(invocation -> "password-hash-input".equals(invocation.getArgument(0))
                ? "pending-password-hash" : "stored-otp-hash");
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of());

        var result = service.beginRegistration(signup(), "192.0.2.4");

        ArgumentCaptor<OtpChallenge> challenge = ArgumentCaptor.forClass(OtpChallenge.class);
        verify(challenges).saveAndFlush(challenge.capture());
        assertEquals("stored-otp-hash", challenge.getValue().getCodeHash());
        assertEquals("pending-password-hash", challenge.getValue().getPendingPasswordHash());
        assertEquals("PENDING", challenge.getValue().getStatus());
        assertEquals(300, result.expiresInSeconds());
        verify(users, never()).insertUser(any());
        ArgumentCaptor<SimpleMailMessage> email = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(email.capture());
        var codeMatch = Pattern.compile("(?<![0-9])[0-9]{6}(?![0-9])").matcher(email.getValue().getText());
        assertTrue(codeMatch.find());
        assertFalse(result.message().contains(codeMatch.group()));
    }

    @Test
    void wrongOtpIncrementsAndPersistsAttemptCount() {
        OtpChallenge challenge = pending("REGISTER", "stored-otp-hash");
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of(challenge));
        when(encoder.matches("000000", "stored-otp-hash")).thenReturn(false);

        var result = service.verify(new OtpVerifyRequest("person@gmail.com", "REGISTER", "000000"));

        assertFalse(result.verified());
        assertEquals(1, challenge.getAttemptCount());
        verify(challenges).save(challenge);
        verify(users, never()).insertUser(any());
    }

    @Test
    void validRegistrationOtpCreatesVerifiedUserAndReturnsJwtOnce() {
        OtpChallenge challenge = pending("REGISTER", "stored-otp-hash");
        challenge.setPendingPasswordHash("pending-password-hash");
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of(challenge));
        when(encoder.matches("123456", "stored-otp-hash")).thenReturn(true);
        when(jwt.generateToken(any(health_assistant.module.users.entity.User.class))).thenReturn("access-jwt");

        var response = service.verify(new OtpVerifyRequest("person@gmail.com", "REGISTER", "123456"));

        assertTrue(response.verified());
        assertEquals("access-jwt", response.login().getToken());
        assertEquals("USED", challenge.getStatus());
        ArgumentCaptor<health_assistant.module.users.entity.User> user = ArgumentCaptor.forClass(health_assistant.module.users.entity.User.class);
        verify(users).insertUser(user.capture());
        assertTrue(user.getValue().isEmailVerified());
        assertEquals("pending-password-hash", user.getValue().getPassword());
    }

    @Test
    void usedOtpCannotBeReusedToCreateAnotherUser() {
        OtpChallenge challenge = pending("REGISTER", "stored-otp-hash");
        challenge.setStatus("USED"); challenge.setConsumedAt(Instant.now());
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of(challenge));

        var response = service.verify(new OtpVerifyRequest("person@gmail.com", "REGISTER", "123456"));

        assertFalse(response.verified());
        verify(encoder, never()).matches(anyString(), anyString());
        verify(users, never()).insertUser(any());
    }

    @Test
    void fifthWrongOtpLocksChallengeAndLaterCorrectCodeCannotBeUsed() {
        OtpChallenge challenge = pending("REGISTER", "stored-otp-hash");
        challenge.setAttemptCount(4);
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of(challenge));
        when(encoder.matches(anyString(), eq("stored-otp-hash"))).thenReturn(false);

        var result = service.verify(new OtpVerifyRequest("person@gmail.com", "REGISTER", "000000"));

        assertFalse(result.verified());
        assertEquals("LOCKED", challenge.getStatus());
        assertNotNull(challenge.getConsumedAt());
        verify(challenges).save(challenge);
    }

    @Test
    void expiredOtpIsPersistentlyInvalidated() {
        OtpChallenge challenge = pending("REGISTER", "stored-otp-hash");
        challenge.setExpiresAt(Instant.now().minusSeconds(1));
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER")).thenReturn(List.of(challenge));

        assertFalse(service.verify(new OtpVerifyRequest("person@gmail.com", "REGISTER", "123456")).verified());
        assertEquals("EXPIRED", challenge.getStatus());
        verify(encoder, never()).matches(anyString(), anyString());
    }

    @Test
    void passwordResetVerificationCreatesOnlyHashedSingleUseGrant() {
        OtpChallenge challenge = pending("RESET_PASSWORD", "stored-otp-hash");
        when(challenges.findPendingForUpdate("person@gmail.com", "RESET_PASSWORD")).thenReturn(List.of(challenge));
        when(encoder.matches("123456", "stored-otp-hash")).thenReturn(true);

        var response = service.verify(new OtpVerifyRequest("person@gmail.com", "RESET_PASSWORD", "123456"));

        assertTrue(response.verified());
        assertNull(response.login());
        assertNotNull(response.resetToken());
        assertEquals(64, response.resetToken().length());
        assertEquals("USED", challenge.getStatus());
        ArgumentCaptor<PasswordResetGrant> grant = ArgumentCaptor.forClass(PasswordResetGrant.class);
        verify(grants).save(grant.capture());
        assertNotEquals(response.resetToken(), grant.getValue().getTokenHash());
        assertNotNull(challenge.getConsumedAt());
    }

    @Test
    void smtpFailureDoesNotPersistOrReportAnIssuedChallenge() {
        when(users.findByUsername("person@gmail.com")).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenAnswer(invocation -> "password-hash-input".equals(invocation.getArgument(0))
                ? "pending-password-hash" : "stored-otp-hash");
        doThrow(new org.springframework.mail.MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));

        assertThrows(OtpEmailDeliveryException.class, () -> service.beginRegistration(signup(), "192.0.2.4"));
        verify(challenges, never()).save(any());
        verify(users, never()).insertUser(any());
    }

    @Test
    void duplicateRegistrationUsesSameGenericResponseWithoutIssuingOtp() {
        when(users.findByUsername("person@gmail.com")).thenReturn(Optional.of(new health_assistant.module.users.entity.User()));

        var result = service.beginRegistration(signup(), "192.0.2.4");

        assertTrue(result.message().contains("Náº¿u thÃ´ng tin phÃ¹ há»£p"));
        verify(mail).send(any(SimpleMailMessage.class));
        verify(challenges, never()).save(any());
    }

    @Test
    void forgotPasswordForUnknownEmailUsesGenericResponseWithoutIssuingOtp() {
        when(users.findByUsername("person@gmail.com")).thenReturn(Optional.empty());

        var result = service.beginPasswordReset(new health_assistant.module.users.dto.request.ForgotPasswordRequest("person@gmail.com"), "192.0.2.4");

        assertFalse(result.message().contains("person@gmail.com"));
        assertFalse(result.message().matches(".*[0-9]{6}.*"));
        verify(mail).send(any(SimpleMailMessage.class));
        verify(challenges, never()).save(any());
        verify(challenges, never()).saveAndFlush(any());
    }

    @Test
    void resendSupersedesPreviousChallengeAndPersistsOnlyTheNewHash() {
        OtpChallenge previous = pending("REGISTER", "previous-otp-hash");
        previous.setPendingPasswordHash("pending-password-hash");
        when(challenges.findPendingForUpdate("person@gmail.com", "REGISTER"))
                .thenReturn(List.of(previous), List.of(previous));
        when(users.findByUsername("person@gmail.com")).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenReturn("new-otp-hash");

        service.resend(new health_assistant.module.users.dto.request.ResendOtpRequest("person@gmail.com", "REGISTER"), "192.0.2.4");

        assertEquals("SUPERSEDED", previous.getStatus());
        verify(challenges).save(previous);
        ArgumentCaptor<OtpChallenge> saved = ArgumentCaptor.forClass(OtpChallenge.class);
        verify(challenges).saveAndFlush(saved.capture());
        OtpChallenge replacement = saved.getValue();
        assertEquals("new-otp-hash", replacement.getCodeHash());
        assertEquals("pending-password-hash", replacement.getPendingPasswordHash());
        verify(mail).send(any(SimpleMailMessage.class));
    }

    @Test
    void resetGrantIsBoundToEmailAndExpires() {
        when(grants.findForUpdate(eq("person@gmail.com"), anyString())).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.resetPassword(
                new ResetPasswordRequest("person@gmail.com", "a".repeat(64), "new-password-2026"), "192.0.2.4"));
        verify(users, never()).updatePasswordByUsername(anyString(), anyString());
    }

    @Test
    void resetPasswordConsumesGrantAndInvalidatesOldPasswordVersion() throws Exception {
        String token = "b".repeat(64);
        String tokenHash = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        PasswordResetGrant grant = new PasswordResetGrant(); grant.setEmail("person@gmail.com");
        grant.setTokenHash(tokenHash); grant.setExpiresAt(Instant.now().plusSeconds(600));
        when(grants.findForUpdate("person@gmail.com", tokenHash)).thenReturn(Optional.of(grant));
        when(encoder.encode("new-password-2026")).thenReturn("new-bcrypt-hash");
        when(users.updatePasswordByUsername("person@gmail.com", "new-bcrypt-hash")).thenReturn(1);

        service.resetPassword(new ResetPasswordRequest("person@gmail.com", token, "new-password-2026"), "192.0.2.4");

        assertNotNull(grant.getUsedAt());
        verify(users).updatePasswordByUsername("person@gmail.com", "new-bcrypt-hash");
        verify(grants).consumeAllForEmail(eq("person@gmail.com"), any());
        verify(challenges).consumePendingPasswordReset(eq("person@gmail.com"), any());
    }

    private SignUpRequest signup() { return SignUpRequest.builder().email("Person@gmail.com").password("password-hash-input").build(); }
    private OtpChallenge pending(String purpose, String hash) {
        OtpChallenge challenge = new OtpChallenge(); challenge.setId(9L); challenge.setEmail("person@gmail.com");
        challenge.setPurpose(purpose); challenge.setCodeHash(hash); challenge.setStatus("PENDING");
        challenge.setExpiresAt(Instant.now().plusSeconds(300)); challenge.setSentAt(Instant.now());
        if ("REGISTER".equals(purpose)) challenge.setPendingPasswordHash("password-hash");
        return challenge;
    }
}
