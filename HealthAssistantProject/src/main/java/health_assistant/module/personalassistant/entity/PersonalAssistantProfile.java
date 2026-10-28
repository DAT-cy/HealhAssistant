package health_assistant.module.personalassistant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "personal_assistant_profiles", uniqueConstraints =
        @UniqueConstraint(name = "uk_personal_assistant_profile_user", columnNames = "user_id"))
@Getter
@Setter
public class PersonalAssistantProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "fitness_goal", nullable = false, length = 500)
    private String fitnessGoal;

    @Column(name = "current_condition", length = 500)
    private String currentCondition;

    @Column(name = "fitness_level", length = 120)
    private String fitnessLevel;

    @Column(name = "diet_preferences", length = 1000)
    private String dietPreferences;

    @Column(name = "daily_routine", length = 1000)
    private String dailyRoutine;

    @Column(name = "available_training_time", length = 500)
    private String availableTrainingTime;

    @Column(name = "available_equipment", length = 500)
    private String availableEquipment;

    @Column(name = "health_limits", length = 1000)
    private String healthLimits;

    @Column(name = "personal_rules", length = 3000)
    private String personalRules;

    @Column(name = "additional_guidance", length = 2000)
    private String additionalGuidance;

    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long rowVersion;

    @jakarta.persistence.PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @jakarta.persistence.PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
