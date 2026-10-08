package health_assistant.module.coach.dto;

import health_assistant.module.posture.dto.Point3D;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record AngleRequest(@NotNull @Valid Point3D first,
                           @NotNull @Valid Point3D vertex,
                           @NotNull @Valid Point3D last) {
}
