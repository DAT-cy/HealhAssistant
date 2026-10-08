package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.WorkoutFeedback;
import health_assistant.module.coach.service.ExerciseRepService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import health_assistant.module.workout.entity.WorkoutSession;
import health_assistant.module.workout.repository.WorkoutSessionRepository;
import health_assistant.utils.SecurityUtils;
import java.time.Instant;

@RestController
@RequestMapping(ClientUtils.VERSION + "/workout-engine")
@RequiredArgsConstructor
public class WorkoutEngineController {
    private final ExerciseRepService exerciseRepService;
    private final WorkoutSessionRepository sessionRepository;

    @PostMapping("/track")
    public ResponseEntity<DefaultRes<WorkoutFeedback>> track(
            @RequestParam(name = "exercise") @NotBlank String exercise,
            @RequestParam(name = "jointAngle") double jointAngle,
            @RequestParam(name = "visibility") @Min(0) @Max(1) double visibility,
            @RequestParam(name = "sessionId", required = false) String sessionId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                exerciseRepService.track(exercise, jointAngle, visibility, sessionId)));
    }

    @PostMapping("/end")
    public ResponseEntity<DefaultRes<WorkoutSession>> end(
            @RequestParam(name = "sessionId") String sessionId,
            @RequestParam(name = "exercise", defaultValue = "squat") String exercise) {
        WorkoutSession session = new WorkoutSession();
        session.setUserId(SecurityUtils.getCurrentUserId());
        session.setExercise(exercise);
        session.setReps(exerciseRepService.end(sessionId));
        session.setCompletedAt(Instant.now());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, sessionRepository.save(session)));
    }
}
