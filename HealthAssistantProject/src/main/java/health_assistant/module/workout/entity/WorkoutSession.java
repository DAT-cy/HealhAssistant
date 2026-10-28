package health_assistant.module.workout.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import jakarta.persistence.Version;

import java.time.Instant;

@Entity
@Table(name = "workout_sessions")
@Getter
@Setter
public class WorkoutSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(nullable = false, length = 40)
    private String exercise;
    @Column(nullable = false)
    private int reps;
    @Column(name = "reps_source", nullable = false, length = 12)
    private String repsSource = "AI_LEGACY";
    @Column(name = "plan_slot_id")
    private Long planSlotId;
    @Column(name = "roadmap_id")
    private Long roadmapId;
    @Column(name = "started_at")
    private Instant startedAt;
    @Column(name = "duration_seconds")
    private Long durationSeconds;
    @Column(name = "session_status", nullable = false, length = 16)
    private String status = "COMPLETED";
    @Column(name = "user_rating")
    private Integer userRating;
    @Column(length = 500)
    private String notes;
    @Column(name = "ai_feedback", columnDefinition = "LONGTEXT")
    private String aiFeedback;
    @Column(name = "ai_analysis_count", nullable = false)
    private int aiAnalysisCount;
    @Column(name = "last_ai_analysis_at")
    private Instant lastAiAnalysisAt;
    @Column(nullable = true)
    private Instant completedAt;

    @Version
    private Long rowVersion;
}
