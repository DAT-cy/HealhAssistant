package health_assistant.module.nutrition.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.nutrition.dto.MealLogResponse;
import health_assistant.module.nutrition.dto.MealAnalysisLogResponse;
import health_assistant.module.nutrition.dto.MealReviewRequest;
import health_assistant.module.nutrition.dto.MealRecommendationResponse;
import health_assistant.module.nutrition.service.MealLogService;
import health_assistant.module.nutrition.service.NutritionMealService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/nutrition/meals")
@RequiredArgsConstructor
public class MealLogController {
    private final MealLogService mealLogService;
    private final NutritionMealService nutritionMealService;

    @PostMapping
    public ResponseEntity<DefaultRes<MealLogResponse>> recordReview(@Valid @RequestBody MealReviewRequest request) {
        return ResponseEntity.status(StatusCode.CREATED)
                .body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, mealLogService.recordReview(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<List<MealLogResponse>>> listMine(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, mealLogService.listMine(date)));
    }

    @GetMapping("/recommendation")
    public ResponseEntity<DefaultRes<MealRecommendationResponse>> recommendation(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String mealType,
            @RequestParam(required = false) Long roadmapId) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                nutritionMealService.recommendation(health_assistant.utils.SecurityUtils.getCurrentUserId(), date, mealType, roadmapId)));
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<MealAnalysisLogResponse>> analyze(
            @RequestParam("file") MultipartFile file,
            @RequestParam String mealType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate mealDate,
            @RequestParam(required = false) Long roadmapId,
            @RequestParam(required = false) Integer planDayIndex,
            @RequestParam(defaultValue = "") String plannedMeal,
            @RequestParam(defaultValue = "") String dishName,
            @RequestParam(defaultValue = "") String portionNotes,
            @RequestParam(defaultValue = "") String ingredients) {
        var request = new health_assistant.module.nutrition.dto.MealAnalysisRequest(mealType, mealDate, roadmapId,
                planDayIndex, plannedMeal, dishName, portionNotes, ingredients);
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED,
                nutritionMealService.analyze(health_assistant.utils.SecurityUtils.getCurrentUserId(), file, request)));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<DefaultRes<MealLogResponse>> markReviewed(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                nutritionMealService.markReviewed(health_assistant.utils.SecurityUtils.getCurrentUserId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DefaultRes<Boolean>> discard(@PathVariable Long id) {
        nutritionMealService.discard(health_assistant.utils.SecurityUtils.getCurrentUserId(), id);
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.DELETED, true));
    }
}
