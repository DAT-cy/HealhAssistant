package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeAuditLogRepository extends JpaRepository<KnowledgeAuditLog, Long> {
    List<KnowledgeAuditLog> findTop50ByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
