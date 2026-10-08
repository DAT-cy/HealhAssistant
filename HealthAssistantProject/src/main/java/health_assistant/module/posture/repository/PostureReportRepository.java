package health_assistant.module.posture.repository;

import health_assistant.module.posture.entity.PostureReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostureReportRepository extends JpaRepository<PostureReport, Long> {
    List<PostureReport> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}
