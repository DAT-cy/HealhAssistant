package health_assistant.module.coach.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "roadmap_previews")
@Getter
@Setter
public class RoadmapPreview {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "profile_updated_at", nullable = false)
    private Instant profileUpdatedAt;

    @Lob
    @Column(nullable = false)
    private String optionsJson;

    @Lob
    @Column(name = "schedule_json")
    private String scheduleJson;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;
}
