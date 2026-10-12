package health_assistant.module.dailyplan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.profile.entity.UserProfile;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class GeminiDailyPlanServiceTest {
    private final GeminiClient client = mock(GeminiClient.class);
    private final GeminiDailyPlanService service = new GeminiDailyPlanService(client, new ObjectMapper());

    @Test
    void acceptsValidStructuredPlan() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"title":"Vận động nhẹ","duration":"20 phút","activities":["Khởi động","Đi bộ tại chỗ"],"safetyNotes":["Dừng nếu khó chịu."]}
                """);

        Optional<GeminiDailyPlanService.GeneratedDailyPlan> result = service.generate(profile());

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().activities()).hasSize(2);
    }

    @Test
    void rejectsDurationOutsideSafeRange() {
        when(client.isConfigured()).thenReturn(true);
        when(client.generateJson(anyString(), any())).thenReturn("""
                {"title":"Vận động","duration":"90 phút","activities":["Khởi động","Tập"],"safetyNotes":["Dừng nếu khó chịu."]}
                """);

        assertThat(service.generate(profile())).isEmpty();
    }

    private UserProfile profile() {
        UserProfile profile = new UserProfile();
        profile.setGoal("Tập nhẹ");
        profile.setActivityLevel("Mới bắt đầu");
        profile.setConsent(true);
        return profile;
    }
}
