package health_assistant.module.workout.dto;

public record ActivityLocationPoint(long timestampEpochMillis, double latitude, double longitude, double accuracyMeters) {}
