package health_assistant.module.goals.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "health_goals", indexes = @Index(name = "idx_health_goals_user_status", columnList = "user_id,status"))
@Getter
@Setter
public class HealthGoal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "goal_type", nullable = false, length = 30)
    private String goalType;

    @Column(name = "start_weight_kg", precision = 5, scale = 2)
    private BigDecimal startWeightKg;

    @Column(name = "target_weight_kg", precision = 5, scale = 2)
    private BigDecimal targetWeightKg;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
