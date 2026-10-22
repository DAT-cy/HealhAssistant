package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeChunk;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunk, Long> {
    List<KnowledgeChunk> findAllByDocumentIdOrderByChunkIndexAsc(Long documentId);
    @Query("select c from KnowledgeChunk c join fetch c.document d where d.status = 'APPROVED' and d.deletedAt is null")
    List<KnowledgeChunk> findAllApprovedWithDocument();
    void deleteAllByDocumentId(Long documentId);
}
