package health_assistant.module.doctor.repository;

import health_assistant.module.doctor.entity.Disease;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DiseaseRepository extends JpaRepository<Disease, Long> {
    Optional<Disease> findByCodeAndActiveTrue(String code);
    List<Disease> findAllByActiveTrue(Sort sort);
    long countByActiveTrue();
    long countByActiveTrueAndDoctorRequiredTrue();
}
