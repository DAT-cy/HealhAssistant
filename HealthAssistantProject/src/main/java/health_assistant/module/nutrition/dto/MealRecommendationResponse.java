package health_assistant.module.nutrition.dto;

import java.time.LocalDate;
import java.util.List;
import health_assistant.module.dailyplan.dto.MealKnowledgeSource;

public record MealRecommendationResponse(LocalDate mealDate, String mealType, String suggestedMeal,
                                        boolean nutritionTargetAvailable, String nutritionTarget,
                                        List<String> prioritizeFoods, List<String> limitFoods,
                                        List<String> reasons, List<MealKnowledgeSource> knowledgeSources,
                                        String source, String limitationNote) {}
