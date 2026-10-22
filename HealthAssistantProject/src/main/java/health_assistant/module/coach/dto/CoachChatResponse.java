package health_assistant.module.coach.dto;

import java.util.List;

public record CoachChatResponse(String message, String source, boolean safetyEscalation, List<CoachSource> references) {
    public CoachChatResponse(String message, String source, boolean safetyEscalation) {
        this(message, source, safetyEscalation, List.of());
    }
}
