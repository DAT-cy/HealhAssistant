package health_assistant.module.workout.controller;

import health_assistant.config.response.*;
import health_assistant.module.workout.dto.ExerciseCatalogRequest;
import health_assistant.module.workout.dto.ExerciseCatalogResponse;
import health_assistant.module.workout.entity.ExerciseCatalog;
import health_assistant.module.workout.repository.ExerciseCatalogRepository;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

/** Quản lý thư viện bài tập (Admin và bác sĩ). */
@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/exercises")
@RequiredArgsConstructor
public class AdminExerciseController {
    private final ExerciseCatalogRepository repository;

    @GetMapping
    public ResponseEntity<DefaultRes<List<ExerciseCatalogResponse>>> list() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                repository.findAll(Sort.by("name")).stream().map(ExerciseCatalogResponse::from).toList()));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<DefaultRes<ExerciseCatalogResponse>> create(@Valid @RequestBody ExerciseCatalogRequest request) {
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (repository.existsByCodeIgnoreCase(code)) throw new IllegalArgumentException("Mã bài tập " + code + " đã tồn tại.");
        ExerciseCatalog exercise = new ExerciseCatalog();
        exercise.setCode(code);
        apply(exercise, request);
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, ExerciseCatalogResponse.from(repository.save(exercise))));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<DefaultRes<ExerciseCatalogResponse>> update(@PathVariable Long id, @Valid @RequestBody ExerciseCatalogRequest request) {
        ExerciseCatalog exercise = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài tập."));
        apply(exercise, request); // mã bài tập giữ nguyên
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, ExerciseCatalogResponse.from(repository.save(exercise))));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<DefaultRes<Boolean>> deactivate(@PathVariable Long id) {
        ExerciseCatalog exercise = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài tập."));
        exercise.setActive(false);
        repository.save(exercise);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, true));
    }

    private static void apply(ExerciseCatalog e, ExerciseCatalogRequest r) {
        e.setName(r.name().trim()); e.setMuscleGroup(r.muscleGroup().trim()); e.setDifficulty(r.difficulty());
        e.setEquipment(r.equipment()); e.setInstructions(r.instructions()); e.setSafetyNotes(r.safetyNotes());
        e.setSets(r.sets()); e.setReps(r.reps()); e.setRestSeconds(r.restSeconds());
        e.setCommonMistakes(r.commonMistakes()); e.setContraindications(r.contraindications());
        if (r.active() != null) e.setActive(r.active());
        if (r.contraindicatedDiseaseCodes() != null) {
            List<String> codes = ExerciseCatalogResponse.splitCodes(r.contraindicatedDiseaseCodes().toUpperCase(Locale.ROOT));
            e.setContraindicatedDiseaseCodes(codes.isEmpty() ? null : String.join(",", codes));
        }
    }
}
