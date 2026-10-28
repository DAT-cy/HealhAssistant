package health_assistant.module.users.dto.response;

public record OtpVerificationResponse(boolean verified, String message, LoginResponse login,
                                      String resetToken) {}
