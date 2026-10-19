package health_assistant.module.knowledge.service;

import health_assistant.module.knowledge.dto.KnowledgeAuditResponse;
import health_assistant.module.knowledge.dto.KnowledgeCategoryResponse;
import health_assistant.module.knowledge.dto.KnowledgeDocumentResponse;
import health_assistant.module.knowledge.dto.KnowledgeStatsResponse;
import health_assistant.module.knowledge.entity.KnowledgeAuditLog;
import health_assistant.module.knowledge.entity.KnowledgeCategory;
import health_assistant.module.knowledge.entity.KnowledgeChunk;
import health_assistant.module.knowledge.entity.KnowledgeDocument;
import health_assistant.module.knowledge.repository.KnowledgeAuditLogRepository;
import health_assistant.module.knowledge.repository.KnowledgeCategoryRepository;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import health_assistant.module.knowledge.repository.KnowledgeDocumentRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.sax.BodyContentHandler;
import org.xml.sax.SAXException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseService {
    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "txt", "md");
    private static final int MAX_EXTRACTED_CHARACTERS = 1_000_000;
    private static final int CHUNK_SIZE = 1200;
    private static final int CHUNK_OVERLAP = 150;

    private final KnowledgeCategoryRepository categoryRepository;
    private final KnowledgeDocumentRepository documentRepository;
    private final KnowledgeChunkRepository chunkRepository;
    private final KnowledgeAuditLogRepository auditRepository;
    private final Tika tika = new Tika();

    @Value("${spring.knowledge-base.storage-dir:./data/knowledge-base}")
    private String storageDirectory;

    @PostConstruct
    void initializeCategories() {
        if (categoryRepository.count() > 0) return;
        categoryRepository.saveAll(List.of(
                new KnowledgeCategory("NUTRITION", "Dinh dưỡng", 1),
                new KnowledgeCategory("FOOD", "Thực phẩm", 2),
                new KnowledgeCategory("EXERCISE", "Bài tập", 3),
                new KnowledgeCategory("PLANNING", "Lập kế hoạch", 4),
                new KnowledgeCategory("ADAPTATION", "Điều chỉnh", 5),
                new KnowledgeCategory("SAFETY", "An toàn", 6)
        ));
    }

    @Transactional(readOnly = true)
    public List<KnowledgeCategoryResponse> categories() {
        return categoryRepository.findAllByActiveTrueOrderBySortOrderAsc().stream()
                .map(category -> new KnowledgeCategoryResponse(category.getId(), category.getCode(), category.getName()))
                .toList();
    }

    @Transactional(readOnly = true)
    public KnowledgeStatsResponse stats() {
        return new KnowledgeStatsResponse(
                documentRepository.countByDeletedAtIsNull(),
                documentRepository.countByStatusAndDeletedAtIsNull("REVIEW"),
                documentRepository.countByStatusAndDeletedAtIsNull("APPROVED"),
                documentRepository.countByStatusAndDeletedAtIsNull("REJECTED")
        );
    }

    @Transactional(readOnly = true)
    public List<KnowledgeDocumentResponse> list(String status, String query) {
        Specification<KnowledgeDocument> filter = (root, criteria, builder) -> builder.isNull(root.get("deletedAt"));
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            String normalized = status.trim().toUpperCase(Locale.ROOT);
            if (!Set.of("REVIEW", "APPROVED", "REJECTED").contains(normalized)) {
                throw new IllegalArgumentException("Bộ lọc trạng thái không hợp lệ.");
            }
            filter = filter.and((root, criteria, builder) -> builder.equal(root.get("status"), normalized));
        }
        if (query != null && !query.isBlank()) {
            String like = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
            filter = filter.and((root, criteria, builder) -> builder.or(
                    builder.like(builder.lower(root.get("title")), like),
                    builder.like(builder.lower(root.get("originalFilename")), like),
                    builder.like(builder.lower(root.get("sourceOrganization")), like)
            ));
        }
        return documentRepository.findAll(filter, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .limit(100).map(document -> toResponse(document, false)).toList();
    }

    @Transactional(readOnly = true)
    public KnowledgeDocumentResponse get(Long id) {
        return toResponse(findDocument(id), true);
    }

    @Transactional
    public KnowledgeDocumentResponse upload(MultipartFile file, String title, String categoryCode,
                                            String description, String documentType, String sourceOrganization,
                                            String sourceUrl, String licenseName, boolean rightsConfirmed) {
        validateUpload(file, title, categoryCode, documentType);
        validateMetadata(description, sourceOrganization, sourceUrl, licenseName);
        if (!rightsConfirmed) throw new IllegalArgumentException("Hãy xác nhận bạn có quyền sử dụng tài liệu này.");

        KnowledgeCategory category = categoryRepository.findByCodeAndActiveTrue(categoryCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new IllegalArgumentException("Danh mục không hợp lệ."));
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new IllegalArgumentException("Không đọc được tệp đã chọn.");
        }

        String filename = safeFilename(file.getOriginalFilename());
        String extension = extension(filename);
        String detectedMime = tika.detect(bytes, filename);
        if ("application/x-empty".equals(detectedMime) || "application/octet-stream".equals(detectedMime)) {
            throw new IllegalArgumentException("Không nhận dạng được nội dung tệp.");
        }

        String extracted;
        try {
            BodyContentHandler contentHandler = new BodyContentHandler(MAX_EXTRACTED_CHARACTERS);
            Metadata metadata = new Metadata();
            metadata.set("resourceName", filename);
            new AutoDetectParser().parse(new ByteArrayInputStream(bytes), contentHandler, metadata, new ParseContext());
            extracted = contentHandler.toString().replace("\u0000", "").trim();
        } catch (IOException | SAXException | TikaException exception) {
            log.info("Knowledge file parsing failed ({})", exception.getClass().getSimpleName());
            throw new IllegalArgumentException("Không trích xuất được văn bản; tệp có thể hỏng, được mã hóa hoặc vượt quá giới hạn 1 triệu ký tự.");
        }
        if (extracted.isBlank()) throw new IllegalArgumentException("Tệp không có văn bản để nhập; OCR cho PDF scan chưa được cấu hình.");

        String storageKey = UUID.randomUUID() + "." + extension;
        Path root = storageRoot();
        Path destination = root.resolve(storageKey).normalize();
        if (!destination.startsWith(root)) throw new IllegalArgumentException("Tên tệp không hợp lệ.");

        try {
            Files.createDirectories(root);
            Files.write(destination, bytes);
        } catch (IOException exception) {
            throw new IllegalStateException("Không thể lưu tệp trong vùng lưu trữ riêng của backend.");
        }

        try {
            KnowledgeDocument document = new KnowledgeDocument();
            document.setTitle(title.trim());
            document.setDescription(blankToNull(description));
            document.setCategory(category);
            document.setDocumentType(documentType.trim().toUpperCase(Locale.ROOT));
            document.setSourceOrganization(blankToNull(sourceOrganization));
            document.setSourceUrl(blankToNull(sourceUrl));
            document.setLicenseName(blankToNull(licenseName));
            document.setRightsConfirmed(true);
            document.setStatus("REVIEW");
            document.setOriginalFilename(filename);
            document.setDetectedMime(detectedMime);
            document.setFileSizeBytes(bytes.length);
            document.setFileSha256(sha256(bytes));
            document.setStorageKey(storageKey);
            document.setExtractedText(extracted);
            document.setCreatedBy(SecurityUtils.getCurrentUserId());
            document.setCreatedAt(LocalDateTime.now());
            document.setUpdatedAt(LocalDateTime.now());
            KnowledgeDocument saved = documentRepository.saveAndFlush(document);

            List<String> chunks = splitIntoChunks(extracted);
            saved.setChunkCount(chunks.size());
            chunkRepository.saveAll(java.util.stream.IntStream.range(0, chunks.size())
                    .mapToObj(index -> new KnowledgeChunk(saved, index, chunks.get(index))).toList());
            audit(saved, "UPLOADED", "Tệp được trích xuất thành công; đang chờ admin duyệt.");
            return toResponse(saved, true);
        } catch (RuntimeException exception) {
            try { Files.deleteIfExists(destination); } catch (IOException ignored) { }
            throw exception;
        }
    }

    @Transactional
    public KnowledgeDocumentResponse review(Long id, String action, String note) {
        KnowledgeDocument document = findDocument(id);
        String normalized = action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
        if (!"APPROVE".equals(normalized) && !"REJECT".equals(normalized)) {
            throw new IllegalArgumentException("Thao tác duyệt không hợp lệ.");
        }
        if (!"REVIEW".equals(document.getStatus())) {
            throw new IllegalStateException("Chỉ tài liệu đang chờ duyệt mới được duyệt hoặc từ chối.");
        }
        if ("REJECT".equals(normalized) && (note == null || note.isBlank())) {
            throw new IllegalArgumentException("Cần ghi lý do khi từ chối tài liệu.");
        }
        document.setStatus("APPROVE".equals(normalized) ? "APPROVED" : "REJECTED");
        document.setReviewedBy(SecurityUtils.getCurrentUserId());
        document.setReviewNote(blankToNull(note));
        document.setReviewedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());
        audit(document, "APPROVE".equals(normalized) ? "APPROVED" : "REJECTED", blankToNull(note));
        return toResponse(document, true);
    }

    @Transactional
    public void archive(Long id) {
        KnowledgeDocument document = findDocument(id);
        document.setDeletedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());
        audit(document, "ARCHIVED", "Đưa tài liệu vào lưu trữ; file gốc được giữ lại.");
    }

    @Transactional(readOnly = true)
    public List<KnowledgeAuditResponse> audit(Long id) {
        findDocument(id);
        return auditRepository.findTop50ByDocumentIdOrderByCreatedAtDesc(id).stream()
                .map(log -> new KnowledgeAuditResponse(log.getId(), log.getActorId(), log.getAction(), log.getDetails(), log.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public StoredFile download(Long id) {
        KnowledgeDocument document = findDocument(id);
        Path file = storageRoot().resolve(document.getStorageKey()).normalize();
        if (!file.startsWith(storageRoot()) || !Files.isRegularFile(file)) {
            throw new EntityNotFoundException("Không tìm thấy tệp gốc trong vùng lưu trữ.");
        }
        try {
            return new StoredFile(Files.readAllBytes(file), document.getDetectedMime(), document.getOriginalFilename());
        } catch (IOException exception) {
            throw new IllegalStateException("Không đọc được tệp gốc.");
        }
    }

    private KnowledgeDocument findDocument(Long id) {
        return documentRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài liệu."));
    }

    private void validateUpload(MultipartFile file, String title, String categoryCode, String documentType) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Hãy chọn tệp cần nhập.");
        if (file.getSize() > MAX_FILE_BYTES) throw new IllegalArgumentException("Tệp vượt quá giới hạn 5 MB.");
        if (title == null || title.isBlank() || title.length() > 255) throw new IllegalArgumentException("Tiêu đề bắt buộc và tối đa 255 ký tự.");
        if (categoryCode == null || categoryCode.isBlank()) throw new IllegalArgumentException("Hãy chọn danh mục.");
        if (documentType == null || !Set.of("GUIDELINE", "RESEARCH", "INTERNAL", "PROCEDURE", "FAQ").contains(documentType.trim().toUpperCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Loại tài liệu không hợp lệ.");
        }
        String extension = extension(safeFilename(file.getOriginalFilename()));
        if (!ALLOWED_EXTENSIONS.contains(extension)) throw new IllegalArgumentException("Chỉ hỗ trợ PDF, DOCX, TXT và Markdown.");
    }

    private void validateMetadata(String description, String organization, String sourceUrl, String license) {
        if (description != null && description.length() > 2000) throw new IllegalArgumentException("Mô tả tối đa 2000 ký tự.");
        if (organization != null && organization.length() > 255) throw new IllegalArgumentException("Tên nguồn tối đa 255 ký tự.");
        if (sourceUrl != null && sourceUrl.length() > 1000) throw new IllegalArgumentException("URL/DOI tối đa 1000 ký tự.");
        if (license != null && license.length() > 255) throw new IllegalArgumentException("Thông tin giấy phép tối đa 255 ký tự.");
    }

    private KnowledgeDocumentResponse toResponse(KnowledgeDocument document, boolean includeText) {
        return new KnowledgeDocumentResponse(document.getId(), document.getTitle(), document.getDescription(),
                document.getCategory().getCode(), document.getCategory().getName(), document.getDocumentType(),
                document.getSourceOrganization(), document.getSourceUrl(), document.getLicenseName(), document.isRightsConfirmed(),
                document.getStatus(), document.getOriginalFilename(), document.getDetectedMime(), document.getFileSizeBytes(),
                document.getFileSha256(), document.getChunkCount(), document.getExtractionWarning(),
                includeText ? document.getExtractedText() : null, document.getCreatedBy(), document.getReviewedBy(),
                document.getReviewNote(), document.getCreatedAt(), document.getUpdatedAt(), document.getReviewedAt());
    }

    private void audit(KnowledgeDocument document, String action, String details) {
        auditRepository.save(new KnowledgeAuditLog(document.getId(), SecurityUtils.getCurrentUserId(), action, details));
    }

    private List<String> splitIntoChunks(String text) {
        List<String> result = new java.util.ArrayList<>();
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            if (end < text.length()) {
                int paragraph = text.lastIndexOf('\n', end);
                int space = text.lastIndexOf(' ', end);
                int boundary = Math.max(paragraph, space);
                if (boundary > start + CHUNK_SIZE / 2) end = boundary;
            }
            String content = text.substring(start, end).trim();
            if (!content.isEmpty()) result.add(content);
            if (end >= text.length()) break;
            start = Math.max(start + 1, end - CHUNK_OVERLAP);
        }
        return result;
    }

    private Path storageRoot() { return Paths.get(storageDirectory).toAbsolutePath().normalize(); }
    private String safeFilename(String input) {
        String filename = input == null ? "document" : Paths.get(input.replace('\\', '/')).getFileName().toString();
        filename = filename.replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        return filename.isBlank() ? "document" : filename.substring(0, Math.min(filename.length(), 255));
    }
    private String extension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (Exception exception) { throw new IllegalStateException("Không thể tạo checksum tệp."); }
    }

    public record StoredFile(byte[] bytes, String contentType, String filename) {}
}
