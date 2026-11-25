package health_assistant.module.knowledge.service;

import health_assistant.module.doctor.entity.Disease;
import health_assistant.module.doctor.repository.DiseaseRepository;
import health_assistant.module.knowledge.entity.KnowledgeDocument;
import health_assistant.module.knowledge.repository.KnowledgeDocumentRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KnowledgeReferenceServiceTest {
    private final KnowledgeDocumentRepository documents = mock(KnowledgeDocumentRepository.class);
    private final DiseaseRepository diseases = mock(DiseaseRepository.class);
    private final KnowledgeReferenceService service = new KnowledgeReferenceService(documents, diseases);

    private KnowledgeDocument document(String status, String text) {
        KnowledgeDocument document = new KnowledgeDocument();
        document.setTitle("Hướng dẫn vận động");
        document.setStatus(status);
        document.setSourceOrganization("Bộ Y tế");
        document.setSourceUrl("https://moh.gov.vn/abc");
        document.setExtractedText(text);
        return document;
    }

    @Test
    void returnsApprovedDocumentContentAndTruncatesLongText() {
        when(documents.findByIdAndDeletedAtIsNull(1L)).thenReturn(Optional.of(document("APPROVED", "a".repeat(5000))));
        var preview = service.preview(1L, null);
        assertThat(preview.title()).isEqualTo("Hướng dẫn vận động");
        assertThat(preview.url()).isEqualTo("https://moh.gov.vn/abc");
        assertThat(preview.truncated()).isTrue();
        assertThat(preview.content()).hasSize(KnowledgeReferenceService.MAX_CONTENT_CHARS + 1);
    }

    @Test
    void hidesDocumentsThatAreNotApproved() {
        when(documents.findByIdAndDeletedAtIsNull(2L)).thenReturn(Optional.of(document("REVIEW", "x")));
        assertThatThrownBy(() -> service.preview(2L, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void returnsDiseaseCatalogGuidance() {
        Disease disease = new Disease();
        disease.setCode("HTN");
        disease.setName("Tăng huyết áp");
        disease.setCareGuidance("Đi bộ nhẹ 30 phút.");
        when(diseases.findByCodeAndActiveTrue("HTN")).thenReturn(Optional.of(disease));
        var preview = service.preview(null, "HTN");
        assertThat(preview.title()).contains("Tăng huyết áp");
        assertThat(preview.content()).contains("Đi bộ nhẹ 30 phút.");
    }
}
