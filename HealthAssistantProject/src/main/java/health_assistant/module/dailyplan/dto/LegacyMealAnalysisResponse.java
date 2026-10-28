package health_assistant.module.dailyplan.dto;

import java.util.List;

public record LegacyMealAnalysisResponse(String assessment, String summary, List<String> advice,
                                        List<String> knowledgeSources, String source) {}
