package health_assistant.module.doctor.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "disease_policy_audits", indexes = @Index(name = "idx_disease_policy_audit_disease", columnList = "disease_id,created_at"))
@Getter @Setter @NoArgsConstructor
public class DiseasePolicyAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "disease_id", nullable = false) private Long diseaseId;
    @Column(nullable = false) private int version;
    @Column(name = "changed_by", nullable = false) private Long changedBy;
    @Column(nullable = false, length = 500) private String reason;
    @Column(name = "before_json", columnDefinition = "TEXT") private String beforeJson;
    @Column(name = "after_json", columnDefinition = "TEXT") private String afterJson;
    @Column(nullable = false, length = 20) private String status = "APPLIED";
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public DiseasePolicyAudit(Long diseaseId, int version, Long changedBy, String reason, String beforeJson, String afterJson) {
        this.diseaseId = diseaseId; this.version = version; this.changedBy = changedBy; this.reason = reason; this.beforeJson = beforeJson; this.afterJson = afterJson;
    }
}
