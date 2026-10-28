package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface KnowledgeDocumentRepository extends JpaRepository<KnowledgeDocument, Long>, JpaSpecificationExecutor<KnowledgeDocument> {
    Optional<KnowledgeDocument> findByIdAndDeletedAtIsNull(Long id);
    Optional<KnowledgeDocument> findByFileSha256AndDeletedAtIsNull(String fileSha256);
    long countByDeletedAtIsNull();
    long countByStatusAndDeletedAtIsNull(String status);
}
