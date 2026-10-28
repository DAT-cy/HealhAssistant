package health_assistant.module.billing.dto;

import java.time.Instant;

public record PaymentTransactionResponse(String transactionRef, String planCode, String provider,
                                         String status, String providerStatus, long amountMinor,
                                         String currency, Instant createdAt, Instant paidAt) {}
