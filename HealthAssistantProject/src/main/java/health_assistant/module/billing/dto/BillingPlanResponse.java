package health_assistant.module.billing.dto;

import java.util.List;

public record BillingPlanResponse(String code, String name, long priceMinor, String currency,
                                  int durationDays, List<String> features) {}
