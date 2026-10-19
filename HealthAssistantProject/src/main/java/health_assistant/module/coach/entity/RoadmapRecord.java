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
    @Column(columnDefinition = "TEXT")
    private String overview;
    @Column(name = "weekly_plan", columnDefinition = "MEDIUMTEXT")
    private String weeklyPlan;
    @Column(name = "safety_notes", columnDefinition = "TEXT")
    private String safetyNotes;
    @Column(nullable = false, length = 30)
    private String source;
    @Column(length = 20)
    private String status = "ACTIVE";
    @Column(name = "start_date")
    private java.time.LocalDate startDate;
    @Column(name = "duration_weeks")
    private Integer durationWeeks;
    @Column(name = "version_number")
    private Integer versionNumber;
    @Column(name = "previous_roadmap_id")
    private Long previousRoadmapId;
    @Column(name = "change_reason", length = 500)
    private String changeReason;
    @Column(name = "prompt_version", length = 40)
    private String promptVersion;
    @Column(name = "schema_version", length = 40)
    private String schemaVersion;
    @Column(nullable = false)
    private Instant createdAt;
}
