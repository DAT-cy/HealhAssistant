package health_assistant.module.personalassistant.repository;

import health_assistant.module.personalassistant.entity.PersonalKnowledgeDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PersonalKnowledgeDocumentRepository extends JpaRepository<PersonalKnowledgeDocument, Long> {
    List<PersonalKnowledgeDocument> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<PersonalKnowledgeDocument> findByIdAndUserId(Long id, Long userId);
}
