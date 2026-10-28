package health_assistant.module.personalassistant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "personal_knowledge_documents", indexes = @Index(name = "idx_personal_doc_owner_status", columnList = "user_id,status"))
@Getter
@Setter
public class PersonalKnowledgeDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "content_type", nullable = false, length = 80)
    private String contentType;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "storage_key", length = 700)
    private String storageKey;

    @Column(name = "content_sha256", nullable = false, length = 64)
    private String contentSha256;

    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;

    @Column(name = "processing_status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "processing_error", length = 500)
    private String processingError;

    @Column(name = "source_type", nullable = false, length = 12)
    private String sourceType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private Long rowVersion;

    @jakarta.persistence.PrePersist
    void onCreate() { Instant now = Instant.now(); if (createdAt == null) createdAt = now; if (updatedAt == null) updatedAt = now; }

    @jakarta.persistence.PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
