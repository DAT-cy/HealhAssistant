package health_assistant.module.dailyplan.dto;

import java.util.List;

public record MealAnalysisResponse(String fitStatus, List<MealIdentifiedFoodResponse> identifiedFoods,
                                   String summary, List<String> positiveAspects, List<String> concerns,
                                   List<String> suggestions, MealNutritionEstimate nutritionEstimate,
                                   String confidence, boolean needsMoreInfo, List<MealKnowledgeSource> knowledgeSources,
                                   String source) {}
