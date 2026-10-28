package health_assistant.module.workout.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "activity_sessions", indexes = {
        @Index(name = "idx_activity_session_user_started", columnList = "user_id,started_at"),
        @Index(name = "idx_activity_session_slot", columnList = "plan_slot_id,status")
})
@Getter
@Setter
public class ActivitySession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "roadmap_id", nullable = false)
    private Long roadmapId;

    @Column(name = "plan_slot_id", nullable = false)
    private Long planSlotId;

    @Column(name = "activity_type", nullable = false, length = 20)
    private String activityType;

    @Column(nullable = false, length = 16)
    private String status = "IN_PROGRESS";

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "paused_seconds", nullable = false)
    private long pausedSeconds;

    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "distance_meters")
    private Double distanceMeters;

    @Column
    private Integer steps;

    @Column(name = "pace_seconds_per_km")
    private Double paceSecondsPerKm;

    @Column(name = "average_speed_kmh")
    private Double averageSpeedKmh;

    @Column(name = "distance_source", nullable = false, length = 16)
    private String distanceSource = "UNAVAILABLE";

    @Column(name = "steps_source", nullable = false, length = 20)
    private String stepsSource = "UNAVAILABLE";

    @Column(name = "duration_source", nullable = false, length = 12)
    private String durationSource = "TIMER";

    @Column(name = "gps_sample_count", nullable = false)
    private int gpsSampleCount;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private Long rowVersion;

    @jakarta.persistence.PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
