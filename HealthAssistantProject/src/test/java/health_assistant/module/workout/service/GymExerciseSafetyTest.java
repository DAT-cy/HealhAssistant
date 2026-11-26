package health_assistant.module.workout.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.entity.ExerciseCatalog;
import health_assistant.module.workout.repository.ExerciseCatalogRepository;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GymExerciseSafetyTest {
    private final ExerciseCatalogRepository exercises = mock(ExerciseCatalogRepository.class);
    private final UserProfileRepository profiles = mock(UserProfileRepository.class);
    private final DiseaseRepository diseases = mock(DiseaseRepository.class);
    private final GymWorkoutService service = new GymWorkoutService(exercises, mock(WorkoutSessionRepository.class),
            mock(RoadmapRecordRepository.class), mock(RoadmapPlanSlotRepository.class), profiles,
            mock(CloudinaryUploadService.class), mock(FeatureAccessService.class), mock(GeminiClient.class), new ObjectMapper());

    private static ExerciseCatalog exercise(String code, String name, String blockedDiseases) {
        ExerciseCatalog exercise = new ExerciseCatalog();
        exercise.setCode(code);
        exercise.setName(name);
        exercise.setMuscleGroup("Đùi");
        exercise.setContraindicatedDiseaseCodes(blockedDiseases);
        return exercise;
    }

    @Test
    void parsesProfileDiseaseCodesAndIgnoresCustom() {
        assertThat(ExerciseSafety.diseaseCodes(" knee_oa, CUSTOM:Gout ,HYPERTENSION,")).containsExactly("KNEE_OA", "HYPERTENSION");
        assertThat(ExerciseSafety.diseaseCodes(null)).isEmpty();
        assertThat(ExerciseSafety.blockedBy(exercise("A", "A", "KNEE_OA,ASTHMA"), Set.of("KNEE_OA"))).containsExactly("KNEE_OA");
        assertThat(ExerciseSafety.blockedBy(exercise("A", "A", null), Set.of("KNEE_OA"))).isEmpty();
    }

    @Test
    void hidesContraindicatedExercisesWithDiseaseNames() {
        UserProfile profile = new UserProfile();
        profile.setDiseaseCodes("KNEE_OA");
        when(profiles.findByUserId(7L)).thenReturn(Optional.of(profile));
        when(exercises.findAllByActiveTrueOrderByNameAsc()).thenReturn(List.of(
                exercise("WALK", "Đi bộ nhanh", null),
                exercise("JUMP_SQUAT", "Squat bật nhảy", "KNEE_OA,HYPERTENSION")));
        Disease knee = new Disease();
        knee.setCode("KNEE_OA");
        knee.setName("Thoái hoá khớp gối");
        when(diseases.findByCodeAndActiveTrue("KNEE_OA")).thenReturn(Optional.of(knee));
        service.setDiseaseRepository(diseases);

        var options = service.exerciseOptions(7L);

        assertThat(options.exercises()).extracting(e -> e.code()).containsExactly("WALK");
        assertThat(options.hidden()).singleElement().satisfies(hidden -> {
            assertThat(hidden.code()).isEqualTo("JUMP_SQUAT");
            assertThat(hidden.diseases()).containsExactly("Thoái hoá khớp gối");
        });
        assertThat(options.userDiseases()).containsExactly("Thoái hoá khớp gối");
    }

    @Test
    void userWithoutDiseasesSeesEverything() {
        when(profiles.findByUserId(8L)).thenReturn(Optional.empty());
        when(exercises.findAllByActiveTrueOrderByNameAsc()).thenReturn(List.of(exercise("JUMP_SQUAT", "Squat bật nhảy", "KNEE_OA")));
        assertThat(service.exerciseOptions(8L).exercises()).hasSize(1);
        assertThat(service.exerciseOptions(8L).hidden()).isEmpty();
    }
}
