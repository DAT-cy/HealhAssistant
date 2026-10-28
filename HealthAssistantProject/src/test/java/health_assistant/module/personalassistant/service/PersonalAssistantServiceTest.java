package health_assistant.module.personalassistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import health_assistant.module.personalassistant.dto.PersonalChatRequest;
import health_assistant.module.personalassistant.repository.PersonalAssistantMessageRepository;
import health_assistant.module.personalassistant.repository.PersonalAssistantProfileRepository;
import health_assistant.module.personalassistant.repository.PersonalKnowledgeChunkRepository;
import health_assistant.module.personalassistant.repository.PersonalKnowledgeDocumentRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonalAssistantServiceTest {
    @Mock FeatureAccessService featureAccessService;
    @Mock PersonalAssistantProfileRepository profileRepository;
    @Mock PersonalKnowledgeDocumentRepository documentRepository;
    @Mock PersonalKnowledgeChunkRepository personalChunkRepository;
    @Mock KnowledgeChunkRepository sharedChunkRepository;
    @Mock PersonalAssistantMessageRepository messageRepository;
    @Mock GeminiClient geminiClient;
    @Mock ObjectMapper objectMapper;
    @InjectMocks PersonalAssistantService service;

    @Test
    void premiumIsRequiredBeforeProfileIsRead() {
        doThrow(new AccessDeniedException("premium required")).when(featureAccessService)
                .requireFeature(41L, PersonalAssistantService.PREMIUM_FEATURE);

        assertThrows(AccessDeniedException.class, () -> service.profile(41L));
        verifyNoInteractions(profileRepository);
    }

    @Test
    void documentLookupIsScopedToAuthenticatedOwner() {
        // Document CRUD also uses the same owner-scoped repository lookup.
        when(documentRepository.findByIdAndUserId(9L, 41L)).thenReturn(Optional.empty());
        PersonalKnowledgeDocumentService documents = new PersonalKnowledgeDocumentService(documentRepository,
                personalChunkRepository, featureAccessService);

        assertThrows(EntityNotFoundException.class, () -> documents.owned(41L, 9L));
        verify(documentRepository).findByIdAndUserId(9L, 41L);
        verify(documentRepository, never()).findById(9L);
    }

    @Test
    void noContextWithoutGeneralKnowledgeDoesNotCallModel() {
        when(profileRepository.findByUserId(41L)).thenReturn(Optional.empty());
        when(documentRepository.findTop100ByUserIdOrderByCreatedAtDesc(41L)).thenReturn(List.of());
        when(messageRepository.findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(eq(41L), anyString())).thenReturn(List.of());
        try { when(objectMapper.writeValueAsString(any())).thenReturn("[]"); }
        catch (com.fasterxml.jackson.core.JsonProcessingException exception) { fail(exception); }

        var response = service.chat(41L, new PersonalChatRequest("Tôi nên tập gì?", null, false));

        assertEquals("INSUFFICIENT_CONTEXT", response.source());
        assertTrue(response.sources().isEmpty());
        verifyNoInteractions(geminiClient);
    }
}
