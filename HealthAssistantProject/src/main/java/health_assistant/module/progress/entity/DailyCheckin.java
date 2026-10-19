package health_assistant.module.progress.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_checkins", uniqueConstraints =
        @UniqueConstraint(name = "uk_daily_checkin_user_date", columnNames = {"user_id", "check_in_date"}))
@Getter
@Setter
public class DailyCheckin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "energy_level")
    private Integer energyLevel;

    @Column(name = "sleep_hours", precision = 4, scale = 2)
    private BigDecimal sleepHours;

    @Column(name = "sleep_quality")
    private Integer sleepQuality;

    @Column(name = "fatigue_level")
    private Integer fatigueLevel;

    @Column(length = 20)
    private String mood;

    @Column(name = "activity_notes", length = 500)
    private String activityNotes;

    @Column(length = 1000)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
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
