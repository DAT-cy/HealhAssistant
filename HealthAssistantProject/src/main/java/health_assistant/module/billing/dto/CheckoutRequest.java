package health_assistant.module.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CheckoutRequest(@NotBlank @Size(max = 40) String planCode,
                              @NotBlank @Pattern(regexp = "STRIPE|PAYPAL") String provider) {}
