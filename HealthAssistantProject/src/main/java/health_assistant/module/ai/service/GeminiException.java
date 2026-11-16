package health_assistant.module.ai.service;

public class GeminiException extends RuntimeException {
    public enum Kind { CONFIGURATION, AUTHENTICATION, QUOTA, TIMEOUT, NETWORK, SERVER, INVALID_RESPONSE }

    private final Kind kind;

    public GeminiException(String message) {
        this(Kind.SERVER, message, null);
    }

    public GeminiException(String message, Throwable cause) {
        this(Kind.SERVER, message, cause);
    }

    public GeminiException(Kind kind, String message) {
        this(kind, message, null);
    }

    public GeminiException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
    }

    public Kind getKind() {
        return kind;
    }
}
