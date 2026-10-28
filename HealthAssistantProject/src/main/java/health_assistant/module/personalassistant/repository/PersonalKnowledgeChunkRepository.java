package health_assistant.module.personalassistant.repository;

import health_assistant.module.personalassistant.entity.PersonalKnowledgeChunk;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PersonalKnowledgeChunkRepository extends JpaRepository<PersonalKnowledgeChunk, Long> {
    @Query("select c from PersonalKnowledgeChunk c join fetch c.document d where d.userId = :userId and d.status = 'COMPLETED' and d.id in :documentIds")
    List<PersonalKnowledgeChunk> findCompletedChunks(@Param("userId") Long userId, @Param("documentIds") List<Long> documentIds, Pageable pageable);
    List<PersonalKnowledgeChunk> findAllByDocumentIdOrderByChunkIndexAsc(Long documentId);
    void deleteAllByDocumentId(Long documentId);
}
