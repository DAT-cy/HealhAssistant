package health_assistant.module.ai.service;

public class GeminiException extends RuntimeException {
    public GeminiException(String message) {
        super(message);
    }

    public GeminiException(String message, Throwable cause) {
        super(message, cause);
    }
}
