package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeChunk;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunk, Long> {
    List<KnowledgeChunk> findAllByDocumentIdOrderByChunkIndexAsc(Long documentId);

    @Query(value = "select k from KnowledgeChunk k join fetch k.document d join fetch d.category c where d.status = 'APPROVED' and d.deletedAt is null and c.code in ('NUTRITION', 'FOOD')",
            countQuery = "select count(k) from KnowledgeChunk k join k.document d join d.category c where d.status = 'APPROVED' and d.deletedAt is null and c.code in ('NUTRITION', 'FOOD')")
    List<KnowledgeChunk> findApprovedNutritionChunks(Pageable pageable);

    @Query(value = "select k from KnowledgeChunk k join fetch k.document d join fetch d.category c where d.status = 'APPROVED' and d.deletedAt is null",
            countQuery = "select count(k) from KnowledgeChunk k join k.document d where d.status = 'APPROVED' and d.deletedAt is null")
    List<KnowledgeChunk> findAllApprovedChunks(Pageable pageable);

    @Query("select c from KnowledgeChunk c join fetch c.document d where d.status = 'APPROVED' and d.deletedAt is null")
    List<KnowledgeChunk> findAllApprovedWithDocument();

    void deleteAllByDocumentId(Long documentId);
}
