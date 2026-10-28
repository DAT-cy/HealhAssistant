package health_assistant.module.workout.dto;

public record ExerciseCatalogResponse(Long id, String code, String name, String muscleGroup,
                                      String difficulty, String equipment, String instructions,
                                      String safetyNotes) {}
