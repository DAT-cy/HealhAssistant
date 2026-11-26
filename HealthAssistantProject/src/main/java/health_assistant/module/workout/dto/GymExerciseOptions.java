package health_assistant.module.workout.dto;

import java.util.List;

/** Bài tập gợi ý cho người dùng: chỉ gồm bài phù hợp bệnh lý; bài bị ẩn kèm lý do. */
public record GymExerciseOptions(
        List<ExerciseCatalogResponse> exercises,
        List<HiddenExercise> hidden,
        List<String> userDiseases) {
    public record HiddenExercise(String code, String name, List<String> diseases) {}
}
