package health_assistant.module.billing.repository;

import health_assistant.module.billing.entity.BillingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillingPlanRepository extends JpaRepository<BillingPlan, String> {
    List<BillingPlan> findAllByEnabledTrueOrderByPriceMinorAsc();
    java.util.Optional<BillingPlan> findByCodeAndEnabledTrue(String code);
}
