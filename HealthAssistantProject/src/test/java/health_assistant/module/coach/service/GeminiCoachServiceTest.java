package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapSlotRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class GeminiCoachServiceTest {
    private final GeminiClient client = mock(GeminiClient.class);
    private final GeminiCoachService service = new GeminiCoachService(client, new ObjectMapper());

    @Test
    void returnsRequestedNumberOfWeeksWhenGeminiIsNotConfigured() {
        when(client.isConfigured()).thenReturn(false);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 8, null, null));

        assertThat(response.source()).isEqualTo("fallback");
        assertThat(response.weeklyPlan()).hasSize(8);
        assertThat(response.safetyNotes()).isNotEmpty();
        verifyNoInteractionsAfterConfigurationCheck();
    }

    @Test
    void acceptsStructuredOutputWhenWeekCountMatchesRequest() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"title":"Lộ trình 2 tuần","overview":"Bắt đầu nhẹ.","weeklyPlan":["Tuần 1","Tuần 2"],"safetyNotes":["Dừng nếu khó chịu."]}
                """);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 2, null, null));

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.weeklyPlan()).containsExactly("Tuần 1", "Tuần 2");
    }

    @Test
    void fallsBackWhenStructuredOutputDoesNotMatchRequestedWeekCount() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":["Tuần 1"],"safetyNotes":["Dừng nếu đau."]}
                """);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 2, null, null));

        assertThat(response.source()).isEqualTo("fallback");
        assertThat(response.weeklyPlan()).hasSize(2);
    }

    @Test
    void sendsOnlyTheSelectedTrainingWindowsToThePrompt() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":["Tuần 1"],"safetyNotes":["Dừng nếu đau."]}
                """);
        var request = new GeminiRoadmapRequest("Tăng sức bền", 1, "Mới tập", null,
                List.of(new RoadmapSlotRequest(1, "MORNING", LocalTime.of(6, 0), LocalTime.of(7, 0), "RUNNING", "Chạy nhẹ")));

        service.plan(request);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(client).generateJson(prompt.capture(), any());
        assertThat(prompt.getValue()).contains("Thứ 1 MORNING 06:00-07:00 RUNNING");
        assertThat(prompt.getValue()).contains("Không tự thêm ngày, buổi hoặc giờ tập");
    }

    private void verifyNoInteractionsAfterConfigurationCheck() {
        verify(client, never()).generateJson(anyString(), any());
    }
}
