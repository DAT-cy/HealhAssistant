package health_assistant.module.dailyplan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_plans", uniqueConstraints =
        @UniqueConstraint(name = "uk_daily_plan_user_date", columnNames = {"user_id", "plan_date"}))
@Getter
@Setter
public class DailyPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 40)
    private String duration;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String activities;

    @Column(name = "meal_guidance", columnDefinition = "TEXT")
    private String mealGuidance;

    @Column(name = "safety_notes", nullable = false, columnDefinition = "TEXT")
    private String safetyNotes;

    @Column(nullable = false, length = 40)
    private String source;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "completed_at")
    private Instant completedAt;
}
