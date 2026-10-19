package health_assistant.module.coach.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "plan_adjustments", indexes = @Index(
        name = "idx_plan_adjustments_user_status", columnList = "user_id,status,created_at"))
@Getter
@Setter
public class PlanAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "roadmap_id")
    private Long roadmapId;

    @Column(name = "trigger_type", nullable = false, length = 40)
    private String triggerType;

    @Column(nullable = false, length = 1000)
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "proposed_changes", nullable = false, columnDefinition = "json")
    private String proposedChanges;

    @Column(nullable = false, length = 20)
    private String status = "PROPOSED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
