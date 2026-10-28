package health_assistant.module.personalassistant.dto;

public record PersonalAssistantSource(Long documentId, String title, String sourceType,
                                      String sourceUrl, int chunkIndex, String excerpt) {}
