package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.DoctorProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);
    List<DoctorProfile> findAllByActiveTrueOrderByUpdatedAtAsc();
    long countByActiveTrue();
}
