package health_assistant.module.nutrition.dto;

import java.time.LocalDateTime;
import java.time.LocalDate;
import health_assistant.module.dailyplan.dto.MealAnalysisResponse;

public record MealLogResponse(Long id, LocalDate mealDate, LocalDateTime loggedAt, LocalDateTime reviewedAt, String mealType, String status,
                              String plannedMeal, String dishName, String portionNotes, String ingredients,
                              String photoUrl, String notes, MealAnalysisResponse analysis, String recommendationSource,
                              Long roadmapId, Integer planDayIndex) {}
