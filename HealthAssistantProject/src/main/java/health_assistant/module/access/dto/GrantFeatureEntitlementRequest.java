package health_assistant.module.access.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record GrantFeatureEntitlementRequest(@NotNull Long userId,
                                             @NotBlank @Size(max = 50) String featureCode,
                                             Instant expiresAt,
                                             @Size(max = 120) String grantReference) {}
