package health_assistant.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailSendException;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import health_assistant.module.users.repository.OtpChallengeRepository;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;
import static org.mockito.ArgumentMatchers.any;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "spring.profiles.active=dev",
        "app.otp.rate-limit-secret=integration-only-otp-pepper-never-use-in-production",
        "app.otp.resend-cooldown-seconds=0",
        "gemini.api-key=",
        "billing.stripe-secret-key=",
        "billing.stripe-webhook-secret=",
        "billing.paypal-client-id=",
        "billing.paypal-client-secret=",
        "billing.paypal-webhook-id="
})
@EnabledIfEnvironmentVariable(named = "ASSISTANT_INTEGRATION_DB_URL", matches = ".+")
class BackendApiSmokeIT {
    @Autowired TestRestTemplate http;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired OtpChallengeRepository otpChallenges;
    @MockBean JavaMailSender mailSender;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("ASSISTANT_INTEGRATION_DB_URL"));
        registry.add("spring.datasource.username", () -> env("ASSISTANT_INTEGRATION_DB_USERNAME", "root"));
        registry.add("spring.datasource.password", () -> env("ASSISTANT_INTEGRATION_DB_PASSWORD", ""));
    }

    @Test
    void fullContextAndFreeTierApiSecurityAreLive() {
        ResponseEntity<JsonNode> anonymousStatus = http.getForEntity("/api/v1/billing/me", JsonNode.class);
        assertEquals(HttpStatus.UNAUTHORIZED, anonymousStatus.getStatusCode());

        String email = "a-" + UUID.randomUUID() + "@gmail.com";
        String password = "Audit-Password-2026!";
        ResponseEntity<JsonNode> signUp = http.postForEntity("/api/v1/auth/signup",
                Map.of("email", email, "password", password), JsonNode.class);
        assertEquals(HttpStatus.ACCEPTED, signUp.getStatusCode());
        assertTrue(signUp.getBody().path("data").path("expiresInSeconds").asInt() > 0);

        ResponseEntity<JsonNode> beforeVerification = http.postForEntity("/api/v1/auth/login",
                Map.of("username", email, "password", password), JsonNode.class);
        assertEquals(HttpStatus.UNAUTHORIZED, beforeVerification.getStatusCode());

        ArgumentCaptor<SimpleMailMessage> sentMail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(sentMail.capture());
        assertArrayEquals(new String[]{email}, sentMail.getValue().getTo());
        assertFalse(signUp.getBody().toString().matches(".*[0-9]{6}.*"));
        String registerCode = otpCode(sentMail.getValue());
        ResponseEntity<JsonNode> registrationVerification = http.postForEntity("/api/v1/auth/otp/verify",
                Map.of("email", email, "purpose", "REGISTER", "code", registerCode), JsonNode.class);
        assertEquals(HttpStatus.OK, registrationVerification.getStatusCode());
        String token = registrationVerification.getBody().path("data").path("login").path("token").asText();
        assertFalse(token.isBlank());

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Void> authenticated = new HttpEntity<>(headers);

        ResponseEntity<JsonNode> billing = http.exchange("/api/v1/billing/me", HttpMethod.GET, authenticated, JsonNode.class);
        assertEquals(HttpStatus.OK, billing.getStatusCode());
        assertEquals("FREE", billing.getBody().path("data").path("tier").asText());
        assertFalse(billing.getBody().path("data").path("premiumActive").asBoolean());

        ResponseEntity<JsonNode> feature = http.exchange(
                "/api/v1/features/access?featureCode=AI_PERSONAL_ASSISTANT", HttpMethod.GET, authenticated, JsonNode.class);
        assertEquals(HttpStatus.OK, feature.getStatusCode());
        assertFalse(feature.getBody().path("data").path("enabled").asBoolean());

        ResponseEntity<JsonNode> personalAssistant = http.exchange(
                "/api/v1/personal-assistant/profile", HttpMethod.GET, authenticated, JsonNode.class);
        assertEquals(HttpStatus.FORBIDDEN, personalAssistant.getStatusCode());

        ResponseEntity<JsonNode> forgot = http.postForEntity("/api/v1/auth/forgot-password", Map.of("email", email), JsonNode.class);
        assertEquals(HttpStatus.ACCEPTED, forgot.getStatusCode());
        verify(mailSender, times(2)).send(sentMail.capture());
        var sentMessages = sentMail.getAllValues();
        String resetCode = otpCode(sentMessages.get(sentMessages.size() - 1));
        assertTrue(otpChallenges.findAllByEmailAndPurposeAndStatusOrderByCreatedAtDesc(email, "RESET_PASSWORD", "PENDING").stream()
                .anyMatch(challenge -> passwordEncoder.matches(resetCode, challenge.getCodeHash())));
        ResponseEntity<JsonNode> resetVerification = http.postForEntity("/api/v1/auth/otp/verify",
                Map.of("email", email, "purpose", "RESET_PASSWORD", "code", resetCode), JsonNode.class);
        assertEquals(HttpStatus.OK, resetVerification.getStatusCode(), String.valueOf(resetVerification.getBody()));
        String grant = resetVerification.getBody().path("data").path("resetToken").asText();
        assertEquals(64, grant.length());
        String newPassword = "Audit-New-Password-2026!";
        ResponseEntity<JsonNode> reset = http.postForEntity("/api/v1/auth/reset-password",
                Map.of("email", email, "resetToken", grant, "newPassword", newPassword), JsonNode.class);
        assertEquals(HttpStatus.OK, reset.getStatusCode());

        ResponseEntity<JsonNode> revokedOldToken = http.exchange("/api/v1/billing/me", HttpMethod.GET, authenticated, JsonNode.class);
        assertEquals(HttpStatus.UNAUTHORIZED, revokedOldToken.getStatusCode());
        ResponseEntity<JsonNode> oldPassword = http.postForEntity("/api/v1/auth/login",
                Map.of("username", email, "password", password), JsonNode.class);
        assertEquals(HttpStatus.UNAUTHORIZED, oldPassword.getStatusCode());
        ResponseEntity<JsonNode> newPasswordLogin = http.postForEntity("/api/v1/auth/login",
                Map.of("username", email, "password", newPassword), JsonNode.class);
        assertEquals(HttpStatus.OK, newPasswordLogin.getStatusCode());
    }

    @Test
    void smtpFailureReturnsUnavailableAndRollsBackChallenge() {
        String email = "m-" + UUID.randomUUID() + "@gmail.com";
        doThrow(new MailSendException("simulated SMTP outage")).when(mailSender).send(any(SimpleMailMessage.class));

        ResponseEntity<JsonNode> response = http.postForEntity("/api/v1/auth/signup",
                Map.of("email", email, "password", "Audit-Password-2026!"), JsonNode.class);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertTrue(otpChallenges.findAllByEmailAndPurposeAndStatusOrderByCreatedAtDesc(email, "REGISTER", "PENDING").isEmpty());
    }

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        return value == null ? fallback : value;
    }

    private static String otpCode(SimpleMailMessage message) {
        Matcher matcher = Pattern.compile("(?<![0-9])[0-9]{6}(?![0-9])").matcher(message.getText());
        assertTrue(matcher.find(), "mail body must contain one six-digit OTP");
        return matcher.group();
    }
}
