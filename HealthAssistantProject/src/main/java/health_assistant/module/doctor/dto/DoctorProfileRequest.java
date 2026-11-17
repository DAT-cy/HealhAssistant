package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.*;

public record DoctorProfileRequest(@NotBlank @Size(max = 120) String fullName,
                                   @NotBlank @Size(max = 160) String specialty,
                                   @Size(max = 3000) String degrees,
                                   @Min(0) @Max(80) int yearsExperience,
                                   @Size(max = 5000) String bio) {}
