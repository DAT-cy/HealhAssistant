package health_assistant.module.coach.service;

import health_assistant.module.coach.dto.RoadmapReference;
import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.knowledge.entity.KnowledgeChunk;
import health_assistant.module.knowledge.entity.KnowledgeDocument;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import health_assistant.module.knowledge.service.KnowledgeRetriever;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Lấy tri thức nội bộ (danh mục bệnh + tài liệu đã duyệt gắn với bệnh) để đưa vào prompt tạo lộ trình,
 * kèm danh sách nguồn tham khảo hiển thị cho bác sĩ và người dùng.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoadmapKnowledgeService {
    static final int MAX_CONTEXT_CHARS = 4000;
    private static final int MAX_CHUNK_CHARS = 700;
    private static final int MAX_DOCUMENTS = 4;
    private static final int CHUNKS_PER_DOCUMENT = 2;

    private final DiseaseRepository diseaseRepository;
    private final KnowledgeChunkRepository chunkRepository;
    private final KnowledgeRetriever retriever;

    public record RoadmapKnowledge(String context, List<RoadmapReference> references) {
        public static final RoadmapKnowledge EMPTY = new RoadmapKnowledge("", List.of());
        public boolean hasInternal() { return context != null && !context.isBlank(); }
    }

    @Transactional(readOnly = true)
    public RoadmapKnowledge build(List<String> diseaseCodes, String goal) {
        try {
            return doBuild(diseaseCodes == null ? List.of() : diseaseCodes, goal == null ? "" : goal);
        } catch (RuntimeException exception) {
            // Kho tri thức lỗi không được làm hỏng việc tạo lộ trình: AI vẫn chạy, chỉ là không có tài liệu nội bộ.
            log.warn("Không lấy được tài liệu nội bộ cho lộ trình ({})", exception.getClass().getSimpleName());
            return RoadmapKnowledge.EMPTY;
        }
    }

    private RoadmapKnowledge doBuild(List<String> diseaseCodes, String goal) {
        StringBuilder context = new StringBuilder();
        List<RoadmapReference> references = new ArrayList<>();

        // 1) Hướng dẫn trong danh mục bệnh do Admin/Doctor quản lý.
        List<Disease> diseases = new ArrayList<>();
        for (String code : diseaseCodes) {
            if (code == null || code.isBlank() || code.toUpperCase(Locale.ROOT).startsWith("CUSTOM:")) continue;
            diseaseRepository.findByCodeAndActiveTrue(code).ifPresent(diseases::add);
        }
        for (Disease disease : diseases) {
            String guidance = joinNonBlank(" ", disease.getCareGuidance(), disease.getSpecialInstructions());
            if (guidance.isBlank()) continue;
            append(context, "[Danh mục bệnh – " + disease.getName() + "] " + clip(guidance, MAX_CHUNK_CHARS));
            references.add(new RoadmapReference(RoadmapReference.DISEASE_CATALOG, "Hướng dẫn bệnh lý: " + disease.getName(),
                    "Danh mục bệnh lý nội bộ", httpUrl(disease.getReferenceSource()), null, disease.getCode()));
        }

        // 2) Tài liệu đã duyệt được gắn với đúng bệnh của người dùng.
        Set<String> terms = words(goal + " " + diseases.stream().map(Disease::getName).reduce("", (a, b) -> a + " " + b));
        if (!diseases.isEmpty()) {
            List<String> codes = diseases.stream().map(Disease::getCode).toList();
            Map<Long, List<KnowledgeChunk>> byDocument = new LinkedHashMap<>();
            for (KnowledgeChunk chunk : chunkRepository.findApprovedByDiseaseCodes(codes)) {
                byDocument.computeIfAbsent(chunk.getDocument().getId(), id -> new ArrayList<>()).add(chunk);
            }
            byDocument.values().stream().limit(MAX_DOCUMENTS).forEach(chunks -> {
                KnowledgeDocument document = chunks.get(0).getDocument();
                chunks.stream()
                        .sorted(Comparator.comparingLong((KnowledgeChunk c) -> -overlap(terms, c.getContent()))
                                .thenComparingInt(KnowledgeChunk::getChunkIndex))
                        .limit(CHUNKS_PER_DOCUMENT)
                        .forEach(c -> append(context, "[Tài liệu: " + document.getTitle() + "] " + clip(c.getContent(), MAX_CHUNK_CHARS)));
                references.add(internal(document));
            });
        }

        // 3) Tài liệu chung (không gắn bệnh) về vận động, nếu khớp mục tiêu.
        if (context.length() < MAX_CONTEXT_CHARS - 400) {
            Set<Long> used = new LinkedHashSet<>();
            for (KnowledgeRetriever.Match match : retriever.retrieve(goal + " vận động tập luyện thể dục an toàn")) {
                KnowledgeDocument document = match.chunk().getDocument();
                if (document.getDiseaseCode() != null || !used.add(document.getId()) || used.size() > 2) continue;
                append(context, "[Tài liệu chung: " + document.getTitle() + "] " + clip(match.chunk().getContent(), MAX_CHUNK_CHARS));
                references.add(internal(document));
            }
        }

        String text = context.length() > MAX_CONTEXT_CHARS ? context.substring(0, MAX_CONTEXT_CHARS) : context.toString();
        return new RoadmapKnowledge(text, dedupe(references));
    }

    private static RoadmapReference internal(KnowledgeDocument document) {
        return new RoadmapReference(RoadmapReference.INTERNAL_DOCUMENT, document.getTitle(),
                document.getSourceOrganization(), httpUrl(document.getSourceUrl()), document.getId(), null);
    }

    private static List<RoadmapReference> dedupe(List<RoadmapReference> references) {
        Map<String, RoadmapReference> unique = new LinkedHashMap<>();
        for (RoadmapReference reference : references) unique.putIfAbsent(reference.kind() + "|" + reference.title(), reference);
        return List.copyOf(unique.values());
    }

    private static void append(StringBuilder context, String line) {
        if (context.length() >= MAX_CONTEXT_CHARS) return;
        if (!context.isEmpty()) context.append('\n');
        context.append(line);
    }

    static String httpUrl(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.matches("(?i)https?://\\S{3,}") && trimmed.length() <= 1000 ? trimmed : null;
    }

    private static String clip(String text, int max) {
        String normalized = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        return normalized.length() <= max ? normalized : normalized.substring(0, max - 1) + "…";
    }

    private static String joinNonBlank(String separator, String... values) {
        List<String> parts = new ArrayList<>();
        for (String value : values) if (value != null && !value.isBlank()) parts.add(value.trim());
        return String.join(separator, parts);
    }

    private static long overlap(Set<String> terms, String content) {
        if (terms.isEmpty()) return 0;
        Set<String> contentWords = words(content);
        return terms.stream().filter(contentWords::contains).count();
    }

    private static Set<String> words(String text) {
        String normalized = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        Set<String> result = new LinkedHashSet<>();
        for (String word : normalized.split("[^\\p{L}\\p{N}]+")) if (word.length() > 2) result.add(word);
        return result;
    }
}
