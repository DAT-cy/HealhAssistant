package health_assistant.module.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record FinishActivitySessionRequest(
        @Min(1) @Max(86400) Integer manualDurationSeconds,
        @DecimalMin("0.0") @DecimalMax("500000.0") Double manualDistanceMeters,
        @Min(0) @Max(200000) Integer sensorSteps,
        @Min(0) @Max(200000) Integer manualSteps,
        @Size(max = 5000) List<@Valid ActivityLocationPoint> gpsSamples,
        @Size(max = 500) String notes) {}
