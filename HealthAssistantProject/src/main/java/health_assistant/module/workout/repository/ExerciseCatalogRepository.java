package health_assistant.module.workout.repository;

import health_assistant.module.workout.entity.ExerciseCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExerciseCatalogRepository extends JpaRepository<ExerciseCatalog, Long> {
    List<ExerciseCatalog> findAllByActiveTrueOrderByNameAsc();
    Optional<ExerciseCatalog> findByCodeAndActiveTrue(String code);
}
