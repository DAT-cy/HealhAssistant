package health_assistant.module.knowledge.dto;

import java.time.LocalDateTime;

public record KnowledgeDocumentResponse(
        Long id,
        String title,
        String description,
        String categoryCode,
        String categoryName,
        String documentType,
        String sourceOrganization,
        String sourceUrl,
        String licenseName,
        boolean rightsConfirmed,
        String status,
        String originalFilename,
        String detectedMime,
        long fileSizeBytes,
        String fileSha256,
        int chunkCount,
        String extractionWarning,
        String extractedText,
        Long createdBy,
        Long reviewedBy,
        String reviewNote,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime reviewedAt
) {}
