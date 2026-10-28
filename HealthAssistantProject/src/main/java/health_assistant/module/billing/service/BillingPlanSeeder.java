package health_assistant.module.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.billing.entity.BillingPlan;
import health_assistant.module.billing.repository.BillingPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BillingPlanSeeder implements ApplicationRunner {
    private final BillingPlanRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!repository.existsById("FREE")) repository.save(plan("FREE", "Free", 0, "USD", 0, new String[]{}));
        if (!repository.existsById("PREMIUM_30D")) repository.save(plan("PREMIUM_30D", "Premium · 30 ngày", 499, "USD", 30,
                new String[]{"AI_PLAN_RESCHEDULE", "AI_PERSONAL_ASSISTANT", "AI_GYM_CAMERA"}));
    }

    private BillingPlan plan(String code, String name, long price, String currency, int days, String[] features) throws Exception {
        BillingPlan plan = new BillingPlan();
        plan.setCode(code); plan.setName(name); plan.setPriceMinor(price); plan.setCurrency(currency);
        plan.setDurationDays(days); plan.setFeaturesJson(objectMapper.writeValueAsString(features)); plan.setEnabled(true);
        return plan;
    }
}
