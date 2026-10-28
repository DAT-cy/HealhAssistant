package health_assistant.module.personalassistant.service;

import health_assistant.module.personalassistant.dto.PersonalDocumentResponse;
import health_assistant.module.personalassistant.dto.PersonalDocumentTextRequest;
import health_assistant.module.personalassistant.entity.PersonalKnowledgeChunk;
import health_assistant.module.personalassistant.entity.PersonalKnowledgeDocument;
import health_assistant.module.personalassistant.repository.PersonalKnowledgeChunkRepository;
import health_assistant.module.personalassistant.repository.PersonalKnowledgeDocumentRepository;
import health_assistant.module.access.service.FeatureAccessService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.xml.sax.SAXException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalKnowledgeDocumentService {
    private static final long MAX_PDF_BYTES = 5L * 1024 * 1024;
    private static final int MAX_TEXT_CHARS = 500_000;
    private static final int MAX_CHUNK = 1200;
    private static final int OVERLAP = 150;
    private final PersonalKnowledgeDocumentRepository documentRepository;
    private final PersonalKnowledgeChunkRepository chunkRepository;
    private final FeatureAccessService featureAccessService;
    private final Tika tika = new Tika();

    @Value("${spring.personal-assistant.storage-dir:./storage/personal-assistant}")
    private String storageDirectory;

    @Transactional
    public PersonalDocumentResponse uploadPdf(Long userId, MultipartFile file, String title, String description) {
        requirePremium(userId);
        validateMetadata(title, description);
        byte[] bytes = readPdf(file);
        PersonalKnowledgeDocument document = newDocument(userId, title, description, "PDF", safeFilename(file.getOriginalFilename()), bytes.length, sha256(bytes));
        document.setStatus("PENDING");
        PersonalKnowledgeDocument saved = documentRepository.saveAndFlush(document);
        Path destination = documentDirectory(userId, saved.getId()).resolve("original.pdf").normalize();
        Path root = userRoot(userId);
        if (!destination.startsWith(root)) throw new IllegalArgumentException("Đường dẫn tài liệu không hợp lệ.");
        try {
            Files.createDirectories(destination.getParent());
            Files.write(destination, bytes);
            saved.setStorageKey(destination.toString());
            documentRepository.saveAndFlush(saved);
            return process(saved, bytes);
        } catch (IOException exception) {
            saved.setStatus("FAILED");
            saved.setProcessingError("Không thể lưu file PDF vào vùng lưu trữ runtime.");
            return toResponse(documentRepository.save(saved));
        }
    }

    @Transactional
    public PersonalDocumentResponse createText(Long userId, PersonalDocumentTextRequest request) {
        requirePremium(userId);
        validateMetadata(request.title(), request.description());
        String content = cleanText(request.content());
        if (content.isBlank()) throw new IllegalArgumentException("Nội dung văn bản đang trống.");
        PersonalKnowledgeDocument document = newDocument(userId, request.title(), request.description(), "TEXT", null,
                content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length, sha256(content.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        document.setStatus("PENDING");
        PersonalKnowledgeDocument saved = documentRepository.saveAndFlush(document);
        return completeText(saved, content);
    }

    @Transactional(readOnly = true)
    public List<PersonalDocumentResponse> list(Long userId) {
        requirePremium(userId);
        return documentRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PersonalKnowledgeDocument owned(Long userId, Long documentId) {
        requirePremium(userId);
        return documentRepository.findByIdAndUserId(documentId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài liệu của tài khoản này."));
    }

    @Transactional(readOnly = true)
    public PersonalDocumentResponse get(Long userId, Long documentId) { return toResponse(owned(userId, documentId)); }

    @Transactional
    public PersonalDocumentResponse retry(Long userId, Long documentId) {
        requirePremium(userId);
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (!"FAILED".equals(document.getStatus())) throw new IllegalArgumentException("Chỉ có thể thử lại tài liệu FAILED.");
        document.setStatus("PENDING");
        document.setProcessingError(null);
        documentRepository.saveAndFlush(document);
        if ("TEXT".equals(document.getSourceType())) return completeText(document, document.getExtractedText());
        Path file = resolveDocumentPath(userId, document);
        try { return process(document, Files.readAllBytes(file)); }
        catch (IOException exception) {
            document.setStatus("FAILED");
            document.setProcessingError("Không tìm thấy hoặc không thể đọc file PDF runtime.");
            return toResponse(documentRepository.save(document));
        }
    }

    @Transactional
    public PersonalDocumentResponse updateText(Long userId, Long documentId, PersonalDocumentTextRequest request) {
        requirePremium(userId);
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (!"TEXT".equals(document.getSourceType())) throw new IllegalArgumentException("Nội dung tài liệu PDF chỉ có thể cập nhật bằng cách xóa và tải file mới.");
        validateMetadata(request.title(), request.description());
        String content = cleanText(request.content());
        if (content.isBlank()) throw new IllegalArgumentException("Nội dung văn bản đang trống.");
        chunkRepository.deleteAllByDocumentId(documentId);
        document.setTitle(request.title().trim());
        document.setDescription(blankToNull(request.description()));
        document.setExtractedText(content);
        document.setFileSizeBytes(content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
        document.setContentSha256(sha256(content.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        document.setStatus("PROCESSING");
        return completeText(documentRepository.saveAndFlush(document), content);
    }

    @Transactional
    public void delete(Long userId, Long documentId) {
        requirePremium(userId);
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (document.getStorageKey() != null) {
            Path path = resolveDocumentPath(userId, document);
            try { Files.deleteIfExists(path); }
            catch (IOException exception) { throw new IllegalStateException("Không thể xóa file runtime; tài liệu vẫn chưa bị xóa khỏi database."); }
            deleteEmptyDocumentFolder(path.getParent(), userRoot(userId));
        }
        chunkRepository.deleteAllByDocumentId(documentId);
        documentRepository.delete(document);
    }

    @Transactional(readOnly = true)
    public String content(Long userId, Long documentId) {
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (!"TEXT".equals(document.getSourceType())) throw new IllegalArgumentException("Nội dung PDF không thể chỉnh sửa trực tiếp.");
        return document.getExtractedText();
    }

    @Transactional
    public PersonalDocumentResponse updateMetadata(Long userId, Long documentId, String title, String description) {
        requirePremium(userId);
        validateMetadata(title, description);
        PersonalKnowledgeDocument document = owned(userId, documentId);
        document.setTitle(title.trim());
        document.setDescription(blankToNull(description));
        return toResponse(documentRepository.save(document));
    }

    @Transactional(readOnly = true)
    public byte[] file(Long userId, Long documentId) {
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (document.getStorageKey() == null) throw new EntityNotFoundException("Tài liệu không có file gốc.");
        try { return Files.readAllBytes(resolveDocumentPath(userId, document)); }
        catch (IOException exception) { throw new EntityNotFoundException("Không tìm thấy file PDF."); }
    }

    private void requirePremium(Long userId) { featureAccessService.requireFeature(userId, "AI_PERSONAL_ASSISTANT"); }

    @Transactional(readOnly = true)
    public PersonalKnowledgeDocument requireCompleted(Long userId, Long documentId) {
        PersonalKnowledgeDocument document = owned(userId, documentId);
        if (!"COMPLETED".equals(document.getStatus())) throw new IllegalArgumentException("Chỉ tài liệu COMPLETED mới có thể được sử dụng trong trợ lý chat.");
        return document;
    }

    private PersonalDocumentResponse process(PersonalKnowledgeDocument document, byte[] bytes) {
        document.setStatus("PROCESSING");
        documentRepository.saveAndFlush(document);
        try {
            Metadata metadata = new Metadata();
            BodyContentHandler handler = new BodyContentHandler(MAX_TEXT_CHARS);
            new AutoDetectParser().parse(new ByteArrayInputStream(bytes), handler, metadata, new ParseContext());
            String text = cleanText(handler.toString());
            if (text.isBlank()) throw new IllegalArgumentException("PDF không có lớp văn bản; OCR PDF scan chưa được cấu hình.");
            return completeText(document, text);
        } catch (IOException | SAXException | TikaException | IllegalArgumentException exception) {
            log.warn("Personal PDF processing failed ({})", exception.getClass().getSimpleName());
            document.setStatus("FAILED");
            document.setProcessingError(safeError(exception.getMessage()));
            return toResponse(documentRepository.save(document));
        }
    }

    private PersonalDocumentResponse completeText(PersonalKnowledgeDocument document, String text) {
        document.setStatus("PROCESSING");
        document.setProcessingError(null);
        document.setExtractedText(text);
        documentRepository.saveAndFlush(document);
        try {
            List<String> chunks = chunk(text);
            chunkRepository.deleteAllByDocumentId(document.getId());
            chunkRepository.saveAll(java.util.stream.IntStream.range(0, chunks.size())
                    .mapToObj(index -> new PersonalKnowledgeChunk(document, index, chunks.get(index))).toList());
            document.setExtractedText(text);
            document.setChunkCount(chunks.size());
            document.setStatus("COMPLETED");
            return toResponse(documentRepository.save(document));
        } catch (RuntimeException exception) {
            document.setStatus("FAILED");
            document.setProcessingError(safeError(exception.getMessage()));
            return toResponse(documentRepository.save(document));
        }
    }

    private PersonalKnowledgeDocument newDocument(Long userId, String title, String description, String sourceType,
                                                   String filename, long size, String sha) {
        PersonalKnowledgeDocument document = new PersonalKnowledgeDocument();
        document.setUserId(userId); document.setTitle(title.trim()); document.setDescription(blankToNull(description));
        document.setSourceType(sourceType); document.setOriginalFilename(filename); document.setFileSizeBytes(size);
        document.setContentType("PDF".equals(sourceType) ? "application/pdf" : "text/plain");
        document.setContentSha256(sha);
        return document;
    }

    private byte[] readPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Hãy chọn file PDF.");
        if (file.getSize() > MAX_PDF_BYTES) throw new IllegalArgumentException("PDF vượt giới hạn 5 MB.");
        String filename = safeFilename(file.getOriginalFilename());
        if (!filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) throw new IllegalArgumentException("Chỉ chấp nhận file PDF.");
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 5 || !new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw new IllegalArgumentException("Nội dung file không phải PDF hợp lệ.");
            if (!"application/pdf".equalsIgnoreCase(tika.detect(bytes, filename))) throw new IllegalArgumentException("Không nhận dạng được PDF hợp lệ.");
            return bytes;
        } catch (IOException exception) { throw new IllegalArgumentException("Không đọc được file PDF."); }
    }

    private void validateMetadata(String title, String description) {
        if (title == null || title.isBlank() || title.length() > 200) throw new IllegalArgumentException("Tiêu đề bắt buộc, tối đa 200 ký tự.");
        if (description != null && description.length() > 1000) throw new IllegalArgumentException("Mô tả tối đa 1.000 ký tự.");
    }

    private List<String> chunk(String text) {
        List<String> result = new ArrayList<>(); int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + MAX_CHUNK, text.length());
            if (end < text.length()) {
                int boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf(' ', end));
                if (boundary > start + MAX_CHUNK / 2) end = boundary;
            }
            String part = text.substring(start, end).trim(); if (!part.isEmpty()) result.add(part);
            if (end >= text.length()) break;
            start = Math.max(start + 1, end - OVERLAP);
        }
        return result;
    }

    private String cleanText(String text) {
        if (text == null) return "";
        String result = text.replace("\u0000", "").trim();
        if (result.length() > MAX_TEXT_CHARS) throw new IllegalArgumentException("Văn bản trích xuất vượt 500.000 ký tự.");
        return result;
    }

    private Path userRoot(Long userId) {
        Path root = Paths.get(storageDirectory).toAbsolutePath().normalize();
        Path userRoot = root.resolve(String.valueOf(userId)).normalize();
        if (!userRoot.startsWith(root)) throw new IllegalArgumentException("Đường dẫn tài khoản không hợp lệ.");
        return userRoot;
    }

    private Path documentDirectory(Long userId, Long documentId) {
        Path root = userRoot(userId);
        Path directory = root.resolve(String.valueOf(documentId)).normalize();
        if (!directory.startsWith(root)) throw new IllegalArgumentException("Đường dẫn tài liệu không hợp lệ.");
        return directory;
    }

    private Path resolveDocumentPath(Long userId, PersonalKnowledgeDocument document) {
        Path root = userRoot(userId);
        Path path = Paths.get(document.getStorageKey()).toAbsolutePath().normalize();
        if (!path.startsWith(documentDirectory(userId, document.getId())) || !path.startsWith(root)) throw new IllegalArgumentException("File không nằm trong thư mục riêng của user.");
        return path;
    }

    private void deleteEmptyDocumentFolder(Path folder, Path userRoot) {
        try { Files.deleteIfExists(folder); Files.deleteIfExists(userRoot); }
        catch (IOException ignored) { }
    }

    private String safeFilename(String input) {
        String filename = input == null ? "personal.pdf" : Paths.get(input.replace('\\', '/')).getFileName().toString();
        filename = filename.replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        return filename.isBlank() ? "personal.pdf" : filename.substring(0, Math.min(filename.length(), 255));
    }

    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (Exception exception) { throw new IllegalStateException("Không thể tạo checksum nội dung."); }
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String safeError(String value) {
        String message = value == null || value.isBlank() ? "Lỗi xử lý tài liệu." : value;
        return message.substring(0, Math.min(message.length(), 500));
    }

    private PersonalDocumentResponse toResponse(PersonalKnowledgeDocument document) {
        return new PersonalDocumentResponse(document.getId(), document.getTitle(), document.getDescription(), document.getSourceType(),
                document.getOriginalFilename(), document.getFileSizeBytes(), document.getStatus(), document.getProcessingError(),
                document.getChunkCount(), document.getCreatedAt(), document.getUpdatedAt());
    }
}
