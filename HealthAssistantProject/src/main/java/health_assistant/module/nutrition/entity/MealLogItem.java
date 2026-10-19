package health_assistant.module.nutrition.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "meal_log_items", indexes = @Index(name = "idx_meal_items_log", columnList = "meal_log_id"))
@Getter
@Setter
public class MealLogItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meal_log_id", nullable = false)
    private Long mealLogId;

    @Column(name = "food_id")
    private Long foodId;

    @Column(name = "food_name_snapshot", nullable = false, length = 180)
    private String foodNameSnapshot;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal quantity;

    @Column(name = "serving_grams", nullable = false, precision = 8, scale = 2)
    private BigDecimal servingGrams;

    @Column(name = "calories_kcal", nullable = false, precision = 8, scale = 2)
    private BigDecimal caloriesKcal;

    @Column(name = "protein_g", nullable = false, precision = 8, scale = 2)
    private BigDecimal proteinG = BigDecimal.ZERO;

    @Column(name = "carbohydrates_g", nullable = false, precision = 8, scale = 2)
    private BigDecimal carbohydratesG = BigDecimal.ZERO;

    @Column(name = "fat_g", nullable = false, precision = 8, scale = 2)
    private BigDecimal fatG = BigDecimal.ZERO;
}
