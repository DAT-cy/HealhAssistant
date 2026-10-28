package health_assistant.module.workout.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.workout.dto.ExerciseCatalogResponse;
import health_assistant.module.workout.dto.GymPoseFeedbackResponse;
import health_assistant.module.workout.dto.GymSessionFinishRequest;
import health_assistant.module.workout.dto.GymSessionStartRequest;
import health_assistant.module.workout.dto.WorkoutSessionResponse;
import health_assistant.module.workout.service.GymWorkoutService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/workout/gym")
@RequiredArgsConstructor
public class GymWorkoutController {
    private final GymWorkoutService service;

    @GetMapping("/exercises")
    public ResponseEntity<DefaultRes<List<ExerciseCatalogResponse>>> exercises() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, service.exercises()));
    }

    @PostMapping("/sessions")
    public ResponseEntity<DefaultRes<WorkoutSessionResponse>> start(@Valid @RequestBody GymSessionStartRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED,
                service.start(SecurityUtils.getCurrentUserId(), request.roadmapId(), request.planSlotId(), request.exerciseCode())));
    }

    @PostMapping(value = "/sessions/{sessionId}/analyze-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<GymPoseFeedbackResponse>> analyzePhoto(
            @PathVariable Long sessionId, @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "back") String cameraFacing) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                service.analyzePhoto(SecurityUtils.getCurrentUserId(), sessionId, file, cameraFacing)));
    }

    @PostMapping("/sessions/{sessionId}/finish")
    public ResponseEntity<DefaultRes<WorkoutSessionResponse>> finish(
            @PathVariable Long sessionId, @Valid @RequestBody GymSessionFinishRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                service.finish(SecurityUtils.getCurrentUserId(), sessionId, request)));
    }

    @GetMapping("/sessions/history")
    public ResponseEntity<DefaultRes<List<WorkoutSessionResponse>>> history(@RequestParam Long planSlotId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                service.history(SecurityUtils.getCurrentUserId(), planSlotId)));
    }
}
