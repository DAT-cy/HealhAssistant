package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DoctorReviewRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface DoctorReviewRequestRepository extends JpaRepository<DoctorReviewRequest, Long> {
    List<DoctorReviewRequest> findAllByAssignedDoctorId(Long doctorId, Sort sort);
    List<DoctorReviewRequest> findAllByStatus(String status, Sort sort);
    long countByStatus(String status);
    long countByAssignedDoctorId(Long doctorId);
    Optional<DoctorReviewRequest> findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(Long userId, String decision, List<String> statuses);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DoctorReviewRequest r where r.id = :id")
    Optional<DoctorReviewRequest> findByIdForUpdate(@Param("id") Long id);
}
