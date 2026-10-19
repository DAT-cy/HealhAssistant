package health_assistant.module.knowledge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "kb_documents")
@Getter
@Setter
@NoArgsConstructor
public class KnowledgeDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private KnowledgeCategory category;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "document_type", nullable = false, length = 40)
    private String documentType;

    @Column(name = "source_organization", length = 255)
    private String sourceOrganization;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(name = "license_name", length = 255)
    private String licenseName;

    @Column(name = "rights_confirmed", nullable = false)
    private boolean rightsConfirmed;

    @Column(nullable = false, length = 20)
    private String status = "REVIEW";

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "detected_mime", nullable = false, length = 120)
    private String detectedMime;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "file_sha256", nullable = false, length = 64)
    private String fileSha256;

    @Column(name = "storage_key", nullable = false, length = 700)
    private String storageKey;

    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;

    @Column(name = "extraction_warning", length = 500)
    private String extractionWarning;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "review_note", length = 1000)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Version
    private Long rowVersion;
}
