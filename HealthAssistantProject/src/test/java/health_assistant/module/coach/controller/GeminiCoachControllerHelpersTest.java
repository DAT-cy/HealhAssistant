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

    @Test
    void mergesProfileDiseasesEvenWhenAppSendsNone() {
        assertThat(GeminiCoachController.mergeDiseaseCodes(java.util.List.of(), "HYPERTENSION:MONITORING:uống thuốc,ASTHMA"))
                .containsExactly("HYPERTENSION", "ASTHMA");
        assertThat(GeminiCoachController.mergeDiseaseCodes(java.util.List.of("DIABETES"), "HYPERTENSION"))
                .containsExactly("DIABETES", "HYPERTENSION");
        assertThat(GeminiCoachController.mergeDiseaseCodes(null, null)).isEmpty();
        // Ghi chú tự do (có dấu cách, tiếng Việt) không bị coi là mã bệnh
        assertThat(GeminiCoachController.mergeDiseaseCodes(null, "Đau lưng nhẹ")).isEmpty();
    }

    @Test
    void keepsNameOfDiseaseOutsideCatalog() {
        // Onboarding lưu "CUSTOM:Gout:SUSPECTED", Hồ sơ sức khoẻ lưu "CUSTOM:Gout"; wizard gửi "CUSTOM" (đã cắt tên)
        assertThat(GeminiCoachController.mergeDiseaseCodes(java.util.List.of("CUSTOM", "HTN"), "HTN:MONITORING, CUSTOM:Gout:SUSPECTED, CUSTOM:Đau thần kinh tọa"))
                .containsExactly("HTN", "CUSTOM:Gout", "CUSTOM:Đau thần kinh tọa");
    }
}
