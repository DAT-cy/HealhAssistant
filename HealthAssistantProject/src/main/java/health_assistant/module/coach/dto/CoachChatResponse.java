package health_assistant.module.coach.dto;

public record CoachChatResponse(String message, String source, boolean safetyEscalation) {
}
