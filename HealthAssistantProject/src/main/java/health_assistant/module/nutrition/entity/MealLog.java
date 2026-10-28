package health_assistant.module.nutrition.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meal_logs", indexes = @Index(name = "idx_meal_logs_user_date", columnList = "user_id,logged_at"))
@Getter
@Setter
public class MealLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "meal_date")
    private LocalDate mealDate;

    @Column(name = "meal_type", nullable = false, length = 20)
    private String mealType;

    @Column(nullable = false, length = 20)
    private String status = "EATEN";

    @Column(length = 1000)
    private String notes;

    @Column(name = "roadmap_id")
    private Long roadmapId;

    @Column(name = "plan_day_index")
    private Integer planDayIndex;

    @Column(name = "photo_url", length = 1000)
    private String photoUrl;

    @Column(name = "photo_public_id", length = 255)
    private String photoPublicId;

    @Column(name = "planned_meal", length = 240)
    private String plannedMeal;

    @Column(name = "dish_name", length = 180)
    private String dishName;

    @Column(name = "portion_notes", length = 500)
    private String portionNotes;

    @Column(length = 500)
    private String ingredients;

    @Column(name = "analysis_json", columnDefinition = "LONGTEXT")
    private String analysisJson;

    @Column(name = "recommendation_source", length = 30)
    private String recommendationSource;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
