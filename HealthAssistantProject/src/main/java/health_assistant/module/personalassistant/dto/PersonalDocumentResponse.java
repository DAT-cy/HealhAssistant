package health_assistant.module.personalassistant.dto;

import java.time.Instant;

public record PersonalDocumentResponse(Long id, String title, String description, String sourceType,
                                       String originalFilename, long fileSizeBytes, String status,
                                       String processingError, int chunkCount, Instant createdAt,
                                       Instant updatedAt) {}
