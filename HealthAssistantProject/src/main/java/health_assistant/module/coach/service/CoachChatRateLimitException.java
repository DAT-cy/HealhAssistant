package health_assistant.module.coach.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class CoachChatRateLimitException extends RuntimeException {
    public CoachChatRateLimitException(String message) { super(message); }
}
