package health_assistant.module.coach.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_ai_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uk_daily_ai_review_user_date_roadmap", columnNames = {"user_id", "review_date", "roadmap_id"}),
        indexes = @Index(name = "idx_daily_ai_review_user_date", columnList = "user_id,review_date"))
@Getter
@Setter
public class DailyAiReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "roadmap_id", nullable = false)
    private Long roadmapId;

    @Column(name = "review_date", nullable = false)
    private LocalDate reviewDate;

    @Column(nullable = false, length = 24)
    private String status;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "LONGTEXT")
    private String snapshotJson;

    @Column(name = "review_json", nullable = false, columnDefinition = "LONGTEXT")
    private String reviewJson;

    @Column(name = "proposal_json", columnDefinition = "LONGTEXT")
    private String proposalJson;

    @Column(name = "applied_roadmap_id")
    private Long appliedRoadmapId;

    @Column(name = "decision_reason", length = 500)
    private String decisionReason;

    @Column(nullable = false, length = 20)
    private String source = "GEMINI";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @jakarta.persistence.PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
