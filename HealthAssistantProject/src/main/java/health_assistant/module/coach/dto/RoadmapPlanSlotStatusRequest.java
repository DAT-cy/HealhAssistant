package health_assistant.module.coach.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RoadmapPlanSlotStatusRequest(
        @NotBlank @Pattern(regexp = "PLANNED|UPCOMING|IN_PROGRESS|COMPLETED|SKIPPED|CANCELLED") String status,
        @Size(max = 500) String notes) {}
