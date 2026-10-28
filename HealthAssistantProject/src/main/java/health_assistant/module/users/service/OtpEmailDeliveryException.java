package health_assistant.module.users.service;

public class OtpEmailDeliveryException extends RuntimeException {
    public OtpEmailDeliveryException() { super("Không thể gửi email xác minh lúc này. Vui lòng thử lại sau."); }
}
