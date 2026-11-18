package health_assistant.module.coach.controller;

import health_assistant.module.profile.entity.UserProfile;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiCoachControllerHelpersTest {
    @Test
    void measurementsNeverPrintNull() {
        var profile = new UserProfile();
        profile.setHeightCm(170.0); profile.setWeightKg(65.0); profile.setActivityLevel("UNSPECIFIED");
        String text = GeminiCoachController.measurements(profile);
        assertThat(text).doesNotContain("null").contains("Tuổi: chưa cập nhật", "chiều cao cm: 170.0", "cân nặng kg: 65.0")
                .doesNotContain("trình độ vận động");
    }

    @Test
    void joinNonBlankSkipsEmptyParts() {
        assertThat(GeminiCoachController.joinNonBlank("; ", null, " a ", "", "b")).isEqualTo("a; b");
        assertThat(GeminiCoachController.joinNonBlank("; ")).isEmpty();
    }
}
