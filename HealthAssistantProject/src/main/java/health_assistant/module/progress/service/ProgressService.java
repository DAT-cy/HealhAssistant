package health_assistant.module.progress.service;

import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.posture.repository.PostureReportRepository;
import health_assistant.module.progress.dto.ProgressSummaryResponse;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProgressService {
    private final PostureReportRepository postureRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final WorkoutSessionRepository workoutRepository;

    public ProgressSummaryResponse summary() {
        Long userId = SecurityUtils.getCurrentUserId();
        return new ProgressSummaryResponse(postureRepository.countByUserId(userId),
                roadmapRepository.countByUserId(userId), workoutRepository.countByUserId(userId),
                "posture_reports,roadmaps,workout_sessions", "Số liệu được tính từ dữ liệu đã lưu.");
    }
}
