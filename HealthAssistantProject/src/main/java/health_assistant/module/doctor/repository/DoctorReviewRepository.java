package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DoctorReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoctorReviewRepository extends JpaRepository<DoctorReview, Long> {
    List<DoctorReview> findTop50ByRequestIdOrderByCreatedAtDesc(Long requestId);
    long countByDoctorIdAndAction(Long doctorId, String action);
}
