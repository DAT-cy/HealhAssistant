package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DoctorReviewRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DoctorReviewRequestRepository extends JpaRepository<DoctorReviewRequest, Long> {
    List<DoctorReviewRequest> findAllByAssignedDoctorId(Long doctorId, Sort sort);
    List<DoctorReviewRequest> findAllByStatus(String status, Sort sort);
    List<DoctorReviewRequest> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    long countByStatus(String status);
    long countByAssignedDoctorId(Long doctorId);
    long countByAssignedDoctorIdAndStatusIn(Long doctorId, Collection<String> statuses);
    Optional<DoctorReviewRequest> findFirstByUserIdAndDecisionAndStatusInOrderByCreatedAtDesc(Long userId, String decision, List<String> statuses);
    Optional<DoctorReviewRequest> findFirstByUserIdAndDiseaseCodesAndStatusAndAppliedAtIsNullOrderByCompletedAtDesc(Long userId, String diseaseCodes, String status);
    Optional<DoctorReviewRequest> findFirstByUserIdAndDiseaseCodesAndStatusOrderByCreatedAtDesc(Long userId, String diseaseCodes, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from DoctorReviewRequest r where r.id = :id")
    Optional<DoctorReviewRequest> findByIdForUpdate(@Param("id") Long id);
}
