package health_assistant.module.coach.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "plan_reschedule_previews", indexes = {
        @Index(name = "idx_reschedule_preview_user_status", columnList = "user_id,status,created_at"),
        @Index(name = "idx_reschedule_preview_expiry", columnList = "expires_at")
})
@Getter
@Setter
public class PlanReschedulePreview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "preview_id", nullable = false, unique = true, length = 36)
    private String previewId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "roadmap_id", nullable = false)
    private Long roadmapId;

    @Column(name = "base_version_number")
    private Integer baseVersionNumber;

    @Column(nullable = false, length = 20)
    private String scope;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "request_json", nullable = false, columnDefinition = "LONGTEXT")
    private String requestJson;

    @Column(name = "snapshot_json", nullable = false, columnDefinition = "LONGTEXT")
    private String snapshotJson;

    @Column(name = "proposal_json", nullable = false, columnDefinition = "LONGTEXT")
    private String proposalJson;

    @Column(name = "proposal_summary", nullable = false, length = 1000)
    private String proposalSummary;

    @Column(name = "proposal_differences", nullable = false, columnDefinition = "LONGTEXT")
    private String proposalDifferences;

    @Column(name = "safety_notes", nullable = false, columnDefinition = "LONGTEXT")
    private String safetyNotes;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "applied_roadmap_id")
    private Long appliedRoadmapId;

    @jakarta.persistence.PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
