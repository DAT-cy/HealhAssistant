package health_assistant.module.workout.dto;

import health_assistant.module.workout.entity.ExerciseCatalog;

public record ExerciseCatalogResponse(Long id, String code, String name, String muscleGroup,
                                      String difficulty, String equipment, String instructions,
                                      String safetyNotes, Integer sets, String reps, Integer restSeconds,
                                      String commonMistakes, String contraindications, boolean active) {
    public ExerciseCatalogResponse(Long id, String code, String name, String muscleGroup,
                                   String difficulty, String equipment, String instructions, String safetyNotes) {
        this(id, code, name, muscleGroup, difficulty, equipment, instructions, safetyNotes, null, null, null, null, null, true);
    }

    public static ExerciseCatalogResponse from(ExerciseCatalog e) {
        return new ExerciseCatalogResponse(e.getId(), e.getCode(), e.getName(), e.getMuscleGroup(), e.getDifficulty(), e.getEquipment(),
                e.getInstructions(), e.getSafetyNotes(), e.getSets(), e.getReps(), e.getRestSeconds(), e.getCommonMistakes(),
                e.getContraindications(), e.isActive());
    }
}
