package health_assistant.module.workout.dto;

import java.time.Instant;

public record ActivitySessionResponse(Long id, Long roadmapId, Long planSlotId, String activityType, String status,
                                      Instant startedAt, Instant endedAt, Long durationSeconds,
                                      Double distanceMeters, Integer steps, Double paceSecondsPerKm,
                                      Double averageSpeedKmh, String distanceSource, String stepsSource,
                                      String durationSource, int gpsSampleCount, String notes) {}
