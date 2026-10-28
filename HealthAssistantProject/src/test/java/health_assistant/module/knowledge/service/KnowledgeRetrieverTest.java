package health_assistant.module.knowledge.service;

import health_assistant.module.knowledge.entity.KnowledgeChunk;
import health_assistant.module.knowledge.entity.KnowledgeDocument;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KnowledgeRetrieverTest {
    private final KnowledgeChunkRepository repository = mock(KnowledgeChunkRepository.class);
    private final KnowledgeRetriever retriever = new KnowledgeRetriever(repository);

    @Test
    void expandsVietnameseExerciseDurationQueryToTermsInWhoGuideline() {
        KnowledgeDocument document = new KnowledgeDocument();
        document.setTitle("WHO activity guideline");
        document.setSourceOrganization("World Health Organization");
        document.setSourceUrl("https://www.who.int/publications/i/item/9789240015128");
        document.setStatus("APPROVED");
        KnowledgeChunk chunk = new KnowledgeChunk(document, 3,
                "Adults should do 150-300 minutes of moderate-intensity physical activity throughout the week.");
        when(repository.findAllApprovedWithDocument()).thenReturn(List.of(chunk));

        var matches = retriever.retrieve("Người lớn nên tập vận động bao lâu mỗi tuần?");

        assertThat(matches).hasSize(1);
        assertThat(matches.get(0).chunk()).isSameAs(chunk);
    }

    @Test
    void returnsNoContextWhenOnlyBroadActivityTermsMatch() {
        KnowledgeDocument document = new KnowledgeDocument();
        document.setStatus("APPROVED");
        KnowledgeChunk chunk = new KnowledgeChunk(document, 0,
                "Adults should do regular physical activity throughout the week.");
        when(repository.findAllApprovedWithDocument()).thenReturn(List.of(chunk));

        assertThat(retriever.retrieve("Làm sao duy trì động lực để vận động đều đặn?"))
                .isEmpty();
    }
}
