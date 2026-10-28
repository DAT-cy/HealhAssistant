package health_assistant.module.billing.dto;

import java.time.Instant;
import java.util.List;

public record BillingStatusResponse(String tier, String status, String planCode,
                                    Instant startsAt, Instant endsAt, boolean premiumActive,
                                    List<SubscriptionHistoryResponse> subscriptions,
                                    List<PaymentTransactionResponse> transactions) {}
