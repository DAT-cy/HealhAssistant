package health_assistant.module.workout.dto;

import jakarta.validation.constraints.*;

/** Admin / bác sĩ thêm hoặc sửa bài tập. */
public record ExerciseCatalogRequest(@NotBlank @Size(max = 80) String code,
                                     @NotBlank @Size(max = 160) String name,
                                     @NotBlank @Size(max = 80) String muscleGroup,
                                     @NotBlank @Pattern(regexp = "BEGINNER|INTERMEDIATE|ADVANCED", message = "difficulty phải là BEGINNER, INTERMEDIATE hoặc ADVANCED") String difficulty,
                                     @Size(max = 160) String equipment,
                                     @NotBlank @Size(max = 5000) String instructions,
                                     @Size(max = 5000) String safetyNotes,
                                     @Min(1) @Max(20) Integer sets,
                                     @Size(max = 40) String reps,
                                     @Min(0) @Max(600) Integer restSeconds,
                                     @Size(max = 5000) String commonMistakes,
                                     @Size(max = 5000) String contraindications,
                                     Boolean active) {}
