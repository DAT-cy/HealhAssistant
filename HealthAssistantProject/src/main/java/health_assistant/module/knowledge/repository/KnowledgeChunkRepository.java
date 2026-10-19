package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunk, Long> {
    List<KnowledgeChunk> findAllByDocumentIdOrderByChunkIndexAsc(Long documentId);
    void deleteAllByDocumentId(Long documentId);
}
