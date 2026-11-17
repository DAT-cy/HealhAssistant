package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.*;

public record DiseaseCreateRequest(@NotBlank @Size(max = 40) String code,
                                   @NotBlank @Size(max = 160) String name,
                                   @Size(max = 120) String specialty,
                                   @Size(max = 5000) String description,
                                   @Size(max = 12) String severity,
                                   boolean doctorRequired, boolean roadmapConfirmationRequired,
                                   boolean aiAllowed, @Min(0) @Max(100) int priority) {}
