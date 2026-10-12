package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.dto.CoachChatResponse;
import health_assistant.module.profile.entity.UserProfile;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CoachChatServiceTest {
    private final GeminiClient client = mock(GeminiClient.class);
    private final CoachChatService service = new CoachChatService(client, new ObjectMapper());

    @Test
    void usesSafetyResponseWithoutCallingGeminiForPainReport() {
        CoachChatResponse response = service.reply("Tôi thấy đau khi tập squat", null);

        assertThat(response.safetyEscalation()).isTrue();
        assertThat(response.source()).isEqualTo("safety-rule");
        verifyNoInteractions(client);
    }

    @Test
    void usesFallbackWhenGeminiKeyIsMissing() {
        when(client.isConfigured()).thenReturn(false);

        CoachChatResponse response = service.reply("Làm sao bắt đầu tập nhẹ?", null);

        assertThat(response.source()).isEqualTo("fallback");
        assertThat(response.safetyEscalation()).isFalse();
        verify(client, never()).generateJson(anyString(), any());
    }

    @Test
    void returnsValidatedVietnameseAnswerWhenGeminiIsConfigured() {
        when(client.isConfigured()).thenReturn(true);
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
    }
}
