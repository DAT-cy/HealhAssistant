package health_assistant.module.knowledge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "kb_audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(length = 1000)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public KnowledgeAuditLog(Long documentId, Long actorId, String action, String details) {
        this.documentId = documentId;
        this.actorId = actorId;
        this.action = action;
        this.details = details;
    }
}
