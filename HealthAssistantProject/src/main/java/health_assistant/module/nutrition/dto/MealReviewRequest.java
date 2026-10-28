package health_assistant.module.nutrition.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MealReviewRequest(
        @NotBlank @Pattern(regexp = "BREAKFAST|LUNCH|DINNER") String mealType,
        @Size(max = 240) String plannedMeal,
        @NotBlank @Size(max = 700) String analysisSummary,
        @Size(max = 500) String advice,
        @Size(max = 200) String source) {}
