package health_assistant.module.access.dto;

import java.time.Instant;

public record FeatureEntitlementResponse(Long id, Long userId, String featureCode, boolean enabled,
                                         Instant startsAt, Instant expiresAt, Instant revokedAt,
                                         String grantReference) {}
