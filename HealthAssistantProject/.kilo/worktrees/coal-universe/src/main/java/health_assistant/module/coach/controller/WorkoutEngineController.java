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

@RestController
@RequestMapping(ClientUtils.VERSION + "/workout-engine")
@RequiredArgsConstructor
public class WorkoutEngineController {
    private final ExerciseRepService exerciseRepService;

    @PostMapping("/track")
    public ResponseEntity<DefaultRes<WorkoutFeedback>> track(
            @NotBlank String exercise,
            @RequestParam double jointAngle,
            @RequestParam @Min(0) @Max(1) double visibility) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                exerciseRepService.track(exercise, jointAngle, visibility)));
    }
}
