package health_assistant.module.personalassistant.dto;

import java.time.Instant;

public record PersonalAssistantProfileResponse(Long id, String fitnessGoal, String currentCondition,
                                                String fitnessLevel, String dietPreferences,
                                                String dailyRoutine, String availableTrainingTime,
                                                String availableEquipment, String healthLimits,
                                                String personalRules, String additionalGuidance,
                                                Instant updatedAt) {}
