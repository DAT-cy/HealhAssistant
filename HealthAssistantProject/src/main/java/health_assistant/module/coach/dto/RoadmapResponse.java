package health_assistant.module.coach.dto;

import java.time.Instant;
import java.time.LocalDate;

public record RoadmapResponse(Long id, String title, String overview, String weeklyPlan, String safetyNotes,
                              String source, String status, LocalDate startDate, Integer durationWeeks,
                              Integer versionNumber, Long previousRoadmapId, String changeReason,
                              String promptVersion, String schemaVersion, Instant createdAt) {
}
