package health_assistant.module.knowledge.service;

import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.knowledge.dto.KnowledgeReferencePreview;
import health_assistant.module.knowledge.entity.KnowledgeDocument;
import health_assistant.module.knowledge.repository.KnowledgeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** Cho người dùng/bác sĩ xem nội dung nguồn tham khảo mà AI đã dùng khi tạo lộ trình. */
@Service
@RequiredArgsConstructor
public class KnowledgeReferenceService {
    static final int MAX_CONTENT_CHARS = 4000;

    private final KnowledgeDocumentRepository documentRepository;
    private final DiseaseRepository diseaseRepository;

    @Transactional(readOnly = true)
    public KnowledgeReferencePreview preview(Long documentId, String diseaseCode) {
        if (documentId != null) {
            KnowledgeDocument document = documentRepository.findByIdAndDeletedAtIsNull(documentId)
                    .filter(d -> "APPROVED".equals(d.getStatus()))
                    .orElseThrow(() -> new IllegalArgumentException("Tài liệu không còn khả dụng."));
            return build("INTERNAL_DOCUMENT", document.getTitle(), document.getSourceOrganization(),
                    document.getSourceUrl(), document.getDescription(), document.getExtractedText());
        }
        if (diseaseCode != null && !diseaseCode.isBlank()) {
            Disease disease = diseaseRepository.findByCodeAndActiveTrue(diseaseCode.trim())
                    .orElseThrow(() -> new IllegalArgumentException("Bệnh lý không còn trong danh mục."));
            List<String> parts = new ArrayList<>();
            add(parts, "Hướng dẫn chăm sóc", disease.getCareGuidance());
            add(parts, "Chỉ dẫn đặc biệt", disease.getSpecialInstructions());
            add(parts, "Triệu chứng", disease.getSymptoms());
            add(parts, "Yếu tố nguy cơ", disease.getRiskFactors());
            return build("DISEASE_CATALOG", "Hướng dẫn bệnh lý: " + disease.getName(), "Danh mục bệnh lý nội bộ",
                    disease.getReferenceSource(), disease.getDescription(), String.join("\n\n", parts));
        }
        throw new IllegalArgumentException("Thiếu tài liệu cần xem.");
    }

    private static void add(List<String> parts, String label, String value) {
        if (value != null && !value.isBlank()) parts.add(label + ": " + value.trim());
    }

    private static KnowledgeReferencePreview build(String kind, String title, String organization, String url,
                                                   String description, String text) {
        String content = text == null ? "" : text.replaceAll("[ \\t]+", " ").replaceAll("\\n{3,}", "\n\n").trim();
        boolean truncated = content.length() > MAX_CONTENT_CHARS;
        if (truncated) content = content.substring(0, MAX_CONTENT_CHARS) + "…";
        String link = url != null && url.trim().matches("(?i)https?://\\S{3,}") ? url.trim() : null;
        return new KnowledgeReferencePreview(kind, title, organization, link, description, content, truncated);
    }
}
