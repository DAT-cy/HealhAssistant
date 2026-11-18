package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorReviewRepository extends JpaRepository<DoctorReview, Long> {
    List<DoctorReview> findTop50ByRequestIdOrderByCreatedAtDesc(Long requestId);
    Optional<DoctorReview> findFirstByRequestIdOrderByCreatedAtDescIdDesc(Long requestId);
    long countByDoctorIdAndAction(Long doctorId, String action);
}
