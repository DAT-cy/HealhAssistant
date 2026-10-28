package health_assistant.module.dailyplan.dto;

public record MealNutritionEstimate(boolean available, Integer caloriesMin, Integer caloriesMax,
                                    Double proteinMinG, Double proteinMaxG,
                                    Double carbohydratesMinG, Double carbohydratesMaxG,
                                    Double fatMinG, Double fatMaxG, String confidence, String uncertainty) {}
