package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.*;

public record DoctorReviewDecisionRequest(@NotBlank @Size(max = 30) String action,
                                          @Size(max = 5000) String note) {}
