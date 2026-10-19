package health_assistant.module.knowledge.repository;

import health_assistant.module.knowledge.entity.KnowledgeCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KnowledgeCategoryRepository extends JpaRepository<KnowledgeCategory, Long> {
    List<KnowledgeCategory> findAllByActiveTrueOrderBySortOrderAsc();
    Optional<KnowledgeCategory> findByCodeAndActiveTrue(String code);
}
