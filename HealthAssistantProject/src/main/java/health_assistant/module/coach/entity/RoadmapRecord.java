package health_assistant.module.coach.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "roadmaps")
@Getter
@Setter
public class RoadmapRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(nullable = false, length = 160)
    private String title;
    @Column(length = 4000)
    private String overview;
    @Column(length = 12000)
    private String weeklyPlan;
    @Column(length = 4000)
    private String safetyNotes;
    @Column(nullable = false, length = 30)
    private String source;
    @Column(length = 20)
    private String status = "ACTIVE";
    @Column(name = "start_date")
    private java.time.LocalDate startDate;
    @Column(name = "duration_weeks")
    private Integer durationWeeks;
    @Column(nullable = false)
    private Instant createdAt;
}
