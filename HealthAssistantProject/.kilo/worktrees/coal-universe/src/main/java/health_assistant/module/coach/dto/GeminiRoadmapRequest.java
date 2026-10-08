package health_assistant.module.coach.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record GeminiRoadmapRequest(
        @NotBlank String goal,
        @Min(1) @Max(12) int weeks,
        String postureSummary,
        String restrictions) {
}
