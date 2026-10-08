package health_assistant.module.workout.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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
    @Column(nullable = false)
    private Instant completedAt;
}
