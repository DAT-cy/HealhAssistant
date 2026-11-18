package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.*;

/** Admin sửa thông tin bệnh. Mã bệnh (code) không đổi. active = null thì giữ nguyên. */
public record DiseaseUpdateRequest(@NotBlank @Size(max = 160) String name,
                                   @Size(max = 120) String specialty,
                                   @Size(max = 5000) String description,
                                   @Size(max = 5000) String symptoms,
                                   @Size(max = 5000) String causes,
                                   @Size(max = 5000) String riskFactors,
                                   @Size(max = 5000) String careGuidance,
                                   @Size(max = 1000) String referenceSource,
                                   @Size(max = 12) String severity,
                                   boolean doctorRequired, boolean roadmapConfirmationRequired,
                                   boolean aiAllowed, @Min(0) @Max(100) int priority,
                                   @Size(max = 5000) String specialInstructions,
                                   Boolean active) {}
