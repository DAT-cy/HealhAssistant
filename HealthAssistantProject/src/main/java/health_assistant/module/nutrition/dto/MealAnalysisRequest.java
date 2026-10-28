package health_assistant.module.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record MealAnalysisRequest(
        @NotBlank @Pattern(regexp = "BREAKFAST|LUNCH|DINNER") String mealType,
        @NotNull LocalDate mealDate,
        Long roadmapId,
        Integer planDayIndex,
        @Size(max = 240) String plannedMeal,
        @Size(max = 180) String dishName,
        @Size(max = 500) String portionNotes,
        @Size(max = 500) String ingredients) {}
