package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GeminiRoadmapRequest(
        @NotBlank @Size(max = 120) String goal,
        @Min(1) @Max(12) int weeks,
        @Size(max = 500) String postureSummary,
        @Size(max = 500) String restrictions) {
}
