package health_assistant.module.users.service;

import health_assistant.config.app.JwtService;
import health_assistant.module.users.dto.request.ForgotPasswordRequest;
import health_assistant.module.users.dto.request.OtpVerifyRequest;
import health_assistant.module.users.dto.request.ResetPasswordRequest;
import health_assistant.module.users.dto.request.ResendOtpRequest;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.dto.response.OtpChallengeResponse;
import health_assistant.module.users.dto.response.OtpVerificationResponse;
import health_assistant.module.users.entity.OtpChallenge;
import health_assistant.module.users.entity.PasswordResetGrant;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.OtpChallengeRepository;
import health_assistant.module.users.repository.PasswordResetGrantRepository;
import health_assistant.module.users.repository.UserMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {
    private static final String REGISTER = "REGISTER";
    private static final String RESET_PASSWORD = "RESET_PASSWORD";
    private static final String GENERIC_MESSAGE = "Náº¿u thÃ´ng tin phÃ¹ há»£p, hÆ°á»›ng dáº«n xÃ¡c minh Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘áº¿n email.";
    private static final String INVALID_CODE_MESSAGE = "MÃ£ khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t hiá»‡u lá»±c. HÃ£y yÃªu cáº§u mÃ£ má»›i.";
    private final OtpChallengeRepository challengeRepository;
    private final OtpRateLimitService rateLimitService;
    private final PasswordResetGrantRepository resetGrantRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.otp.expiry-minutes:5}") private int expiryMinutes;
    @Value("${app.otp.resend-cooldown-seconds:60}") private int resendCooldownSeconds;
    @Value("${app.otp.max-attempts:5}") private int maxAttempts;
    @Value("${app.otp.mail-from:${spring.mail.username:}}") private String fromAddress;

    @Transactional
    public OtpChallengeResponse beginRegistration(SignUpRequest request, String remoteAddress) {
        String email = normalize(request.getEmail());
        claim(email, remoteAddress);
        if (userMapper.findByUsername(email).isPresent()) {
            sendGenericNotice(email, "YÃªu cáº§u táº¡o tÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n. Náº¿u Ä‘á»‹a chá»‰ nÃ y cÃ³ thá»ƒ Ä‘Äƒng kÃ½, báº¡n sáº½ nháº­n hÆ°á»›ng dáº«n riÃªng.");
            return challengeResponse();
        }
        String passwordHash = passwordEncoder.encode(request.getPassword());
        issue(email, REGISTER, passwordHash);
        return challengeResponse();
    }

    @Transactional
    public OtpChallengeResponse beginPasswordReset(ForgotPasswordRequest request, String remoteAddress) {
        String email = normalize(request.email());
        claim(email, remoteAddress);
        var account = userMapper.findByUsername(email).filter(user -> user.getPassword() != null);
        if (account.isPresent()) issue(email, RESET_PASSWORD, null);
        else sendGenericNotice(email, "YÃªu cáº§u báº£o máº­t Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n. Náº¿u Ä‘á»‹a chá»‰ nÃ y Ä‘Ã£ Ä‘Äƒng kÃ½, hÆ°á»›ng dáº«n sáº½ Ä‘Æ°á»£c gá»­i riÃªng.");
        return challengeResponse();
    }

    @Transactional
    public OtpChallengeResponse resend(ResendOtpRequest request, String remoteAddress) {
        String email = normalize(request.email());
        String purpose = request.purpose();
        claim(email, remoteAddress);
        List<OtpChallenge> pending = challengeRepository.findPendingForUpdate(email, purpose);
        if (pending.isEmpty()) {
            sendGenericNotice(email, "YÃªu cáº§u xÃ¡c minh Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n. Náº¿u cÃ³ quy trÃ¬nh Ä‘ang chá», hÆ°á»›ng dáº«n sáº½ Ä‘Æ°á»£c gá»­i riÃªng.");
            return challengeResponse();
        }
        OtpChallenge current = pending.get(0);
        if (REGISTER.equals(purpose) && userMapper.findByUsername(email).isPresent()) {
            sendGenericNotice(email, "YÃªu cáº§u xÃ¡c minh Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n. Náº¿u Ä‘á»‹a chá»‰ nÃ y cÃ³ thá»ƒ Ä‘Äƒng kÃ½, hÆ°á»›ng dáº«n sáº½ Ä‘Æ°á»£c gá»­i riÃªng.");
            return challengeResponse();
        }
        if (RESET_PASSWORD.equals(purpose) && userMapper.findByUsername(email).filter(user -> user.getPassword() != null).isEmpty()) {
            sendGenericNotice(email, "YÃªu cáº§u báº£o máº­t Ä‘Ã£ Ä‘Æ°á»£c tiáº¿p nháº­n. Náº¿u Ä‘á»‹a chá»‰ nÃ y Ä‘Ã£ Ä‘Äƒng kÃ½, hÆ°á»›ng dáº«n sáº½ Ä‘Æ°á»£c gá»­i riÃªng.");
            return challengeResponse();
        }
        issue(email, purpose, current.getPendingPasswordHash());
        return challengeResponse();
    }

    @Transactional
    public OtpVerificationResponse verify(OtpVerifyRequest request) {
        String email = normalize(request.email());
        List<OtpChallenge> pending = challengeRepository.findPendingForUpdate(email, request.purpose());
        if (pending.isEmpty()) return invalidVerification();
        OtpChallenge challenge = pending.get(0);
        Instant now = Instant.now();
        if (!"PENDING".equals(challenge.getStatus()) || !challenge.getExpiresAt().isAfter(now)
                || challenge.getAttemptCount() >= maxAttempts) {
            if ("PENDING".equals(challenge.getStatus())) {
                challenge.setStatus(challenge.getAttemptCount() >= maxAttempts ? "LOCKED" : "EXPIRED");
                challenge.setConsumedAt(now);
                challengeRepository.save(challenge);
            }
            return invalidVerification();
        }
        if (!passwordEncoder.matches(request.code(), challenge.getCodeHash())) {
            challenge.setAttemptCount(challenge.getAttemptCount() + 1);
            if (challenge.getAttemptCount() >= maxAttempts) {
                challenge.setStatus("LOCKED");
                challenge.setConsumedAt(now);
            }
            challengeRepository.save(challenge);
            return invalidVerification();
        }

        challenge.setStatus("USED");
        challenge.setConsumedAt(now);
        challengeRepository.save(challenge);
        if (REGISTER.equals(request.purpose())) return completeRegistration(email, challenge);
        return completePasswordResetVerification(email, now);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, String remoteAddress) {
        String email = normalize(request.email());
        rateLimitService.claim("reset-ip", normalizeIp(remoteAddress), 20, Duration.ofHours(1), Duration.ZERO);
        String tokenHash = sha256(request.resetToken());
        PasswordResetGrant grant = resetGrantRepository.findForUpdate(email, tokenHash)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_CODE_MESSAGE));
        Instant now = Instant.now();
        if (grant.getUsedAt() != null || !grant.getExpiresAt().isAfter(now)) {
            throw new IllegalArgumentException(INVALID_CODE_MESSAGE);
        }
        String encodedPassword = passwordEncoder.encode(request.newPassword());
        if (userMapper.updatePasswordByUsername(email, encodedPassword) != 1) {
            throw new EntityNotFoundException("KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.");
        }
        grant.setUsedAt(now);
        resetGrantRepository.save(grant);
        resetGrantRepository.consumeAllForEmail(email, now);
        challengeRepository.consumePendingPasswordReset(email, now);
    }

    private void claim(String email, String remoteAddress) {
        rateLimitService.claim("otp-email", email, 5, Duration.ofHours(1), Duration.ofSeconds(resendCooldownSeconds));
        rateLimitService.claim("otp-ip", normalizeIp(remoteAddress), 30, Duration.ofHours(1), Duration.ZERO);
    }

    private void issue(String email, String purpose, String pendingPasswordHash) {
        String code = String.format(Locale.ROOT, "%06d", secureRandom.nextInt(1_000_000));
        String codeHash = passwordEncoder.encode(code);
        Instant now = Instant.now();
        List<OtpChallenge> pending = challengeRepository.findPendingForUpdate(email, purpose);
        pending.forEach(old -> {
            old.setStatus("SUPERSEDED");
            old.setConsumedAt(now);
            challengeRepository.save(old);
        });
        OtpChallenge challenge = new OtpChallenge();
        challenge.setEmail(email);
        challenge.setPurpose(purpose);
        challenge.setCodeHash(codeHash);
        challenge.setPendingPasswordHash(pendingPasswordHash);
        challenge.setStatus("PENDING");
        challenge.setAttemptCount(0);
        challenge.setSentAt(now);
        challenge.setExpiresAt(now.plusSeconds(expiryMinutes * 60L));
        challengeRepository.saveAndFlush(challenge);
        sendEmail(email, purpose, code);
    }

    private void sendEmail(String email, String purpose, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (StringUtils.hasText(fromAddress)) message.setFrom(fromAddress.trim());
            message.setTo(email);
            message.setSubject(REGISTER.equals(purpose) ? "Health Assistant - XÃ¡c minh email" : "Health Assistant - Äáº·t láº¡i máº­t kháº©u");
            message.setText("MÃ£ xÃ¡c minh Health Assistant cá»§a báº¡n lÃ : " + code + "\n\nMÃ£ cÃ³ hiá»‡u lá»±c trong "
                    + expiryMinutes + " phÃºt vÃ  chá»‰ sá»­ dá»¥ng Ä‘Æ°á»£c má»™t láº§n. Náº¿u báº¡n khÃ´ng yÃªu cáº§u, hÃ£y bá» qua email nÃ y.\n\nKhÃ´ng chia sáº» mÃ£ nÃ y vá»›i báº¥t ká»³ ai.");
            mailSender.send(message);
        } catch (RuntimeException exception) {
            log.warn("OTP email delivery failed ({})", exception.getClass().getSimpleName());
            throw new OtpEmailDeliveryException();
        }
    }

    private void sendGenericNotice(String email, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (StringUtils.hasText(fromAddress)) message.setFrom(fromAddress.trim());
            message.setTo(email);
            message.setSubject("Health Assistant - YÃªu cáº§u báº£o máº­t tÃ i khoáº£n");
            message.setText(body + "\n\nNáº¿u báº¡n khÃ´ng thá»±c hiá»‡n yÃªu cáº§u nÃ y, hÃ£y bá» qua email.");
            mailSender.send(message);
        } catch (RuntimeException exception) {
            log.warn("Generic account notification delivery failed ({})", exception.getClass().getSimpleName());
            throw new OtpEmailDeliveryException();
        }
    }

    private OtpVerificationResponse completeRegistration(String email, OtpChallenge challenge) {
        if (challenge.getPendingPasswordHash() == null) return invalidVerification();
        if (userMapper.findByUsername(email).isPresent()) return invalidVerification();
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setPassword(challenge.getPendingPasswordHash());
        user.setRole(Role.ROLE_USER);
        user.setEnable(true);
        user.setIsDeleted(false);
        user.setEmailVerified(true);
        try {
            userMapper.insertUser(user);
        } catch (RuntimeException exception) {
            log.info("Verified registration could not create account ({})", exception.getClass().getSimpleName());
            return invalidVerification();
        }
        LoginResponse login = LoginResponse.builder().username(user.getUsername()).role(user.getRole())
                .token(jwtService.generateToken(user)).build();
        return new OtpVerificationResponse(true, "Email Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c minh.", login, null);
    }

    private OtpVerificationResponse completePasswordResetVerification(String email, Instant now) {
        String token = randomToken();
        resetGrantRepository.consumeAllForEmail(email, now);
        PasswordResetGrant grant = new PasswordResetGrant();
        grant.setEmail(email);
        grant.setTokenHash(sha256(token));
        grant.setExpiresAt(now.plus(Duration.ofMinutes(10)));
        resetGrantRepository.save(grant);
        return new OtpVerificationResponse(true, "XÃ¡c minh thÃ nh cÃ´ng. HÃ£y Ä‘áº·t máº­t kháº©u má»›i.", null, token);
    }

    @Scheduled(cron = "0 15 */6 * * *")
    @Transactional
    public void cleanupExpired() {
        Instant now = Instant.now();
        Instant cutoff = now.minus(Duration.ofDays(2));
        challengeRepository.deleteExpiredOrOldClosed(now, cutoff);
        resetGrantRepository.deleteExpiredOrOldUsed(now, cutoff);
        rateLimitService.cleanup(cutoff);
    }

    private OtpChallengeResponse challengeResponse() {
        return new OtpChallengeResponse(GENERIC_MESSAGE, expiryMinutes * 60, resendCooldownSeconds);
    }
    private OtpVerificationResponse invalidVerification() { return new OtpVerificationResponse(false, INVALID_CODE_MESSAGE, null, null); }
    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private String normalizeIp(String ip) { return ip == null || ip.isBlank() ? "unknown" : ip.trim(); }
    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
    private String sha256(String input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("KhÃ´ng thá»ƒ xÃ¡c minh yÃªu cáº§u báº£o máº­t."); }
    }
}
