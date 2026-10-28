package health_assistant.module.coach.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "roadmap_plan_slots", indexes = {
        @Index(name = "idx_roadmap_slots_day", columnList = "roadmap_id,day_index,session_period"),
        @Index(name = "idx_roadmap_slots_status", columnList = "roadmap_id,status")
})
@Getter
@Setter
public class RoadmapPlanSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private RoadmapRecord roadmap;

    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    @Column(name = "session_period", nullable = false, length = 12)
    private String sessionPeriod;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "activity_type", nullable = false, length = 20)
    private String activityType;

    @Column(nullable = false, length = 100)
    private String activity;

    @Column(nullable = false, length = 16)
    private String status = "UPCOMING";

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "actual_duration_minutes")
    private Integer actualDurationMinutes;

    @Column(name = "skip_reason", length = 300)
    private String skipReason;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
