package health_assistant.module.profile.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "user_profiles", uniqueConstraints = @UniqueConstraint(name = "uk_profile_user", columnNames = "user_id"))
@Getter
@Setter
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(length = 40)
    private String goal;

    @Column(name = "activity_level", length = 40)
    private String activityLevel;

    @Column(length = 10)
    private String gender;

    private Integer age;
    private Double heightCm;
    private Double weightKg;

    @Column(length = 1000)
    private String restrictions;

    @Column(name = "pain_areas", length = 1000)
    private String painAreas;

    @Column(name = "disease_codes", length = 2000) private String diseaseCodes;
    @Column(columnDefinition = "TEXT") private String symptoms;
    @Column(name = "medical_history", columnDefinition = "TEXT") private String medicalHistory;
    @Column(name = "family_history", columnDefinition = "TEXT") private String familyHistory;
    @Column(columnDefinition = "TEXT") private String allergies;
    @Column(columnDefinition = "TEXT") private String medications;
    @Column(name = "lifestyle_notes", columnDefinition = "TEXT") private String lifestyleNotes;
    @Column(name = "sleep_hours") private Double sleepHours;
    @Column(name = "health_metrics", columnDefinition = "TEXT") private String healthMetrics;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Column(name = "avatar_public_id", length = 255)
    private String avatarPublicId;

    @Column(nullable = false)
    private boolean consent;

    @Column(nullable = false)
    private Instant updatedAt;
}
