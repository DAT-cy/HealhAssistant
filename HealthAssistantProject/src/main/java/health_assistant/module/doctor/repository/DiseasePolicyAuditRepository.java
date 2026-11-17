package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DiseasePolicyAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DiseasePolicyAuditRepository extends JpaRepository<DiseasePolicyAudit, Long> {
    List<DiseasePolicyAudit> findTop50ByDiseaseIdOrderByCreatedAtDesc(Long diseaseId);
    int countByDiseaseId(Long diseaseId);
}
