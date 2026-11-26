package health_assistant.module.workout.controller;

import health_assistant.module.workout.dto.ExerciseCatalogRequest;
import health_assistant.module.workout.entity.ExerciseCatalog;
import health_assistant.module.workout.repository.ExerciseCatalogRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminExerciseControllerTest {
    private final ExerciseCatalogRepository repository = mock(ExerciseCatalogRepository.class);
    private final AdminExerciseController controller = new AdminExerciseController(repository);

    private static ExerciseCatalogRequest request(String diseases) {
        return new ExerciseCatalogRequest("squat", "Squat", "Đùi, mông", "BEGINNER", null, "Đứng rộng bằng vai...",
                null, 3, "10-12", 60, "Gối đổ vào trong", "Đau gối cấp", null, diseases);
    }

    @Test
    void createNormalizesCodeAndContraindicatedDiseases() {
        when(repository.existsByCodeIgnoreCase("SQUAT")).thenReturn(false);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var body = controller.create(request(" knee_oa, HYPERTENSION ,knee_oa,")).getBody();

        ArgumentCaptor<ExerciseCatalog> saved = ArgumentCaptor.forClass(ExerciseCatalog.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getCode()).isEqualTo("SQUAT");
        assertThat(saved.getValue().getContraindicatedDiseaseCodes()).isEqualTo("KNEE_OA,HYPERTENSION");
        assertThat(body.getData().contraindicatedDiseaseCodes()).containsExactly("KNEE_OA", "HYPERTENSION");
    }

    @Test
    void updateWithEmptyDiseasesClearsList() {
        ExerciseCatalog existing = new ExerciseCatalog();
        existing.setCode("SQUAT");
        existing.setContraindicatedDiseaseCodes("KNEE_OA");
        when(repository.findById(1L)).thenReturn(Optional.of(existing));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        controller.update(1L, request(""));

        assertThat(existing.getContraindicatedDiseaseCodes()).isNull();
        assertThat(existing.getCode()).isEqualTo("SQUAT");
    }
}
