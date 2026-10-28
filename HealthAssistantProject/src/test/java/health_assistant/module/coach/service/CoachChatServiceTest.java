package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.dto.CoachChatResponse;
import health_assistant.module.knowledge.service.KnowledgeRetriever;
import health_assistant.module.profile.entity.UserProfile;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CoachChatServiceTest {
    private final GeminiClient client = mock(GeminiClient.class);
    private final KnowledgeRetriever retriever = mock(KnowledgeRetriever.class);
    private final CoachChatService service = new CoachChatService(client, new ObjectMapper(), retriever);

    @Test
    void usesSafetyResponseWithoutCallingGeminiForPainReport() {
        CoachChatResponse response = service.reply("Tôi thấy đau khi tập squat", null);

        assertThat(response.safetyEscalation()).isTrue();
        assertThat(response.source()).isEqualTo("safety-rule");
        verifyNoInteractions(client);
        verifyNoInteractions(retriever);
    }

    @Test
    void usesFallbackWhenGeminiKeyIsMissing() {
        when(client.isConfigured()).thenReturn(false);
        when(retriever.retrieve(anyString())).thenReturn(java.util.List.of());

        CoachChatResponse response = service.reply("Làm sao bắt đầu tập nhẹ?", null);

        assertThat(response.source()).isEqualTo("fallback");
        assertThat(response.safetyEscalation()).isFalse();
        verify(client, never()).generateJson(anyString(), any());
    }

    @Test
    void returnsValidatedVietnameseAnswerWhenGeminiIsConfigured() {
        when(client.isConfigured()).thenReturn(true);
        when(retriever.retrieve(anyString())).thenReturn(java.util.List.of());
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"message":"Hãy bắt đầu với thời lượng ngắn và tăng dần khi cảm thấy thoải mái.","safetyEscalation":false}
                """);
        UserProfile profile = new UserProfile();
        profile.setGoal("Tập thể lực");
        profile.setActivityLevel("Mới bắt đầu");
        profile.setConsent(true);

        CoachChatResponse response = service.reply("Tôi nên bắt đầu tập thế nào?", profile);

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.safetyEscalation()).isFalse();
        assertThat(response.message()).contains("bắt đầu");
        assertThat(response.references()).isEmpty();
    }

    @Test
    void usesGeneralKnowledgeWhenNoApprovedKnowledgeMatches() {
        when(client.isConfigured()).thenReturn(true);
        when(retriever.retrieve(anyString())).thenReturn(java.util.List.of());
        when(client.generateJson(anyString(), any())).thenAnswer(invocation -> {
            assertThat(invocation.getArgument(0, String.class)).contains("Không tìm thấy đoạn Knowledge Base");
            return "{\"message\":\"Vận động đều đặn có thể hỗ trợ sức khỏe tổng thể.\",\"safetyEscalation\":false}";
        });

        CoachChatResponse response = service.reply("Vì sao nên vận động?", null);

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.references()).isEmpty();
    }
}
