package health_assistant.module.nutrition.dto;

import health_assistant.module.dailyplan.dto.MealAnalysisResponse;

public record MealAnalysisLogResponse(MealLogResponse meal, MealAnalysisResponse analysis) {}
