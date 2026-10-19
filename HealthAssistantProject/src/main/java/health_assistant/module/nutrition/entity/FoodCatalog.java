package health_assistant.module.nutrition.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "food_catalog", indexes = @Index(name = "idx_food_catalog_name", columnList = "name,is_active"))
@Getter
@Setter
public class FoodCatalog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(name = "serving_name", nullable = false, length = 100)
    private String servingName;

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

    @Column(length = 255)
    private String source;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
