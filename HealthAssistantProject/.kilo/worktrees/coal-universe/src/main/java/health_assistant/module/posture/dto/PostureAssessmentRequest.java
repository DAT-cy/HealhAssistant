package health_assistant.module.posture.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record PostureAssessmentRequest(
        @NotNull @Valid Point3D leftShoulder,
        @NotNull @Valid Point3D rightShoulder,
        @NotNull @Valid Point3D leftHip,
        @NotNull @Valid Point3D rightHip,
        @NotNull @Valid Point3D leftEar,
        @NotNull @Valid Point3D rightEar,
        @NotNull @Valid Point3D neck,
        @NotNull String view) {
}
