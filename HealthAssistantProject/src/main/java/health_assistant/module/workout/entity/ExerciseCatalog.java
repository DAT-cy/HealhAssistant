package health_assistant.module.workout.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "exercise_catalog",
        uniqueConstraints = @UniqueConstraint(name = "uk_exercise_catalog_code", columnNames = "code"),
        indexes = @Index(name = "idx_exercise_catalog_group", columnList = "muscle_group,difficulty,is_active"))
@Getter
@Setter
public class ExerciseCatalog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "muscle_group", nullable = false, length = 80)
    private String muscleGroup;

    @Column(nullable = false, length = 20)
    private String difficulty;

    @Column(length = 160)
    private String equipment;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "safety_notes", columnDefinition = "TEXT")
    private String safetyNotes;

    /** Số hiệp gợi ý. */
    @Column(name = "set_count")
    private Integer sets;

    /** Số lần mỗi hiệp, dạng chuỗi để ghi "10-12" hoặc "30 giây". */
    @Column(name = "reps", length = 40)
    private String reps;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    @Column(name = "common_mistakes", columnDefinition = "TEXT")
    private String commonMistakes;

    /** Chống chỉ định / trường hợp không nên tập. */
    @Column(name = "contraindications", columnDefinition = "TEXT")
    private String contraindications;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
