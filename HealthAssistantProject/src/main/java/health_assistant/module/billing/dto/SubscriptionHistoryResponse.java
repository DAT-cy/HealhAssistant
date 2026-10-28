package health_assistant.module.billing.dto;

import java.time.Instant;

public record SubscriptionHistoryResponse(Long id, String planCode, String provider, String status,
                                          Instant startsAt, Instant endsAt, Instant cancelledAt,
                                          Instant refundedAt) {}
