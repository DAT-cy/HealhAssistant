package health_assistant.module.coach.dto;

import java.time.Instant;

public record CoachChatThreadResponse(String threadId, String lastMessage, Instant lastMessageAt) {}
