package health_assistant.module.billing.dto;

public record CheckoutResponse(String transactionRef, String provider, String status,
                               String approvalUrl, long amountMinor, String currency) {}
