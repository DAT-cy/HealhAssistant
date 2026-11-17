package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.*;

public record DiseasePolicyUpdateRequest(@NotBlank @Size(max = 12) String severity,
                                         boolean doctorRequired, boolean roadmapConfirmationRequired,
                                         boolean aiAllowed, @Min(0) @Max(100) int priority,
                                         @Size(max = 5000) String specialInstructions,
                                         @NotBlank @Size(max = 500) String reason) {}
