package health_assistant.module.users.dto.response;

public record OtpChallengeResponse(String message, int expiresInSeconds, int resendAfterSeconds) {}
