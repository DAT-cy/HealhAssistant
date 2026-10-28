package health_assistant.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "billing_plans")
@Getter
@Setter
public class BillingPlan {
    @Id @Column(length = 40)
    private String code;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(name = "price_minor", nullable = false)
    private long priceMinor;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(name = "duration_days", nullable = false)
    private int durationDays;
    @Column(name = "features_json", nullable = false, columnDefinition = "TEXT")
    private String featuresJson;
    @Column(nullable = false)
    private boolean enabled = true;
}
