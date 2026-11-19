package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.ai.service.GeminiException;
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
    void propagatesConfigurationErrorWhenGeminiIsNotConfigured() {
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class))).thenThrow(new GeminiException(GeminiException.Kind.CONFIGURATION, "not configured"));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.plan(new GeminiRoadmapRequest("Tập nhẹ", 8, null, null)))
                .isInstanceOf(GeminiException.class);
    }

    @Test
    void acceptsStructuredOutputWhenWeekCountMatchesRequest() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class))).thenReturn("""
                {"title":"Lộ trình 2 tuần","overview":"Bắt đầu nhẹ.","weeklyPlan":["Tuần 1","Tuần 2"],"safetyNotes":["Dừng nếu khó chịu."]}
                """);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 2, null, null));

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.weeklyPlan()).containsExactly("Tuần 1", "Tuần 2");
    }

    @Test
    void padsMissingWeeksInsteadOfFailing() {
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class))).thenReturn("""
                {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":["Tuần 1"],"safetyNotes":[]}
                """);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 3, null, null));

        assertThat(response.source()).isEqualTo("gemini");
        assertThat(response.weeklyPlan()).hasSize(3).first().isEqualTo("Tuần 1");
        assertThat(response.weeklyPlan().get(2)).startsWith("Tuần 3:");
        assertThat(response.safetyNotes()).hasSize(1);
    }

    @Test
    void mergesDailyItemsIntoRequestedWeeks() {
        var days = java.util.stream.IntStream.rangeClosed(1, 14).mapToObj(i -> "Ngày " + i).toList();
        var weeks = GeminiCoachService.normalizeWeeks(days, 2);
        assertThat(weeks).hasSize(2);
        assertThat(weeks.get(0)).startsWith("Ngày 1;").endsWith("Ngày 7");
        assertThat(weeks.get(1)).startsWith("Ngày 8;").endsWith("Ngày 14");
    }

    @Test
    void stillRejectsEmptyWeeklyPlan() {
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class))).thenReturn("""
                {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":[],"safetyNotes":["Dừng nếu đau."]}
                """);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.plan(new GeminiRoadmapRequest("Tập nhẹ", 2, null, null)))
                .isInstanceOf(GeminiException.class);
    }

    @Test
    void sendsOnlyTheSelectedTrainingWindowsToThePrompt() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class))).thenReturn("""
                {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":["Tuần 1"],"safetyNotes":["Dừng nếu đau."]}
                """);
        var request = new GeminiRoadmapRequest("Tăng sức bền", 1, "Mới tập", null,
                List.of(new RoadmapSlotRequest(1, "MORNING", LocalTime.of(6, 0), LocalTime.of(7, 0), "RUNNING", "Chạy nhẹ")));

        service.plan(request);

        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(client).generateJson(prompt.capture(), any(), any(GeminiClient.Options.class));
        assertThat(prompt.getValue()).contains("Thứ 1 MORNING 06:00-07:00 RUNNING");
        assertThat(prompt.getValue()).contains("Không tự thêm ngày, buổi hoặc giờ tập");
    }

    @Test
    void retriesOnceWhenModelReturnsTruncatedJson() {
        when(client.generateJson(anyString(), any(), any(GeminiClient.Options.class)))
                .thenReturn("{\"title\":\"Lộ trình\",\"overview\":\"Mô")
                .thenReturn("""
                        {"title":"Lộ trình","overview":"Mô tả.","weeklyPlan":["Tuần 1"],"safetyNotes":["Dừng nếu đau."]}
                        """);

        GeminiRoadmapResponse response = service.plan(new GeminiRoadmapRequest("Tập nhẹ", 1, null, null));

        assertThat(response.title()).isEqualTo("Lộ trình");
        verify(client, times(2)).generateJson(anyString(), any(), any(GeminiClient.Options.class));
    }

    private void verifyNoInteractionsAfterConfigurationCheck() {
        verify(client, never()).generateJson(anyString(), any(), any(GeminiClient.Options.class));
    }
}
