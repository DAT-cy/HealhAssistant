package health_assistant.module.availability.dto;

import java.time.Instant;
import java.time.LocalTime;

public record AvailabilitySlotResponse(Long id, int dayOfWeek, LocalTime startTime, LocalTime endTime,
                                       String activityType, String locationType, String equipmentNotes,
                                       boolean active, Instant createdAt) {
}
