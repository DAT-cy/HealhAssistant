package health_assistant.module.coach.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PlanReschedulePreviewResponse(String previewId, Long roadmapId, String scope, LocalDate targetDate,
                                            boolean premium, String status, String summary, List<String> differences,
                                            List<DailyScheduleChange> changes, List<String> safetyNotes,
                                            Instant expiresAt) {}
