package health_assistant.module.coach.dto;

import health_assistant.module.personalassistant.dto.PersonalAssistantSource;

import java.time.Instant;
import java.util.List;

public record CoachChatResponse(String threadId, String message, String source, boolean safetyEscalation,
                                List<PersonalAssistantSource> sources,
                                PlanReschedulePreviewResponse scheduleProposal, Instant createdAt) {
    public CoachChatResponse(String message, String source, boolean safetyEscalation) {
        this(null, message, source, safetyEscalation, List.of(), null, null);
    }
}
