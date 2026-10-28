package health_assistant.module.personalassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PersonalAssistantProfileRequest(
        @NotBlank @Size(max = 500) String fitnessGoal,
        @Size(max = 500) String currentCondition,
        @Size(max = 120) String fitnessLevel,
        @Size(max = 1000) String dietPreferences,
        @Size(max = 1000) String dailyRoutine,
        @Size(max = 500) String availableTrainingTime,
        @Size(max = 500) String availableEquipment,
        @Size(max = 1000) String healthLimits,
        @Size(max = 3000) String personalRules,
        @Size(max = 2000) String additionalGuidance) {}
