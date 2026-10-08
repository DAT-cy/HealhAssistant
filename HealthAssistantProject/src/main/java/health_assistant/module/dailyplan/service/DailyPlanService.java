package health_assistant.module.dailyplan.service;

import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DailyPlanService {
    private final UserProfileRepository profileRepository;

    public DailyPlanResponse today() {
        UserProfile profile = profileRepository.findByUserId(SecurityUtils.getCurrentUserId()).orElse(null);
        String goal = profile == null ? "xây dựng thói quen vận động" : profile.getGoal();
        return new DailyPlanResponse(LocalDate.now().toString(), "Buổi tập nền tảng", "25 phút",
                List.of("Khởi động 5 phút", "Squat cơ bản 3 hiệp · 10 lần", "Giãn cơ toàn thân 8 phút"),
                List.of("Tập ở cường độ vừa. Nếu cảm thấy đau, hãy dừng bài."),
                profile == null ? "fallback-no-profile" : "profile-based:" + goal);
    }
}
