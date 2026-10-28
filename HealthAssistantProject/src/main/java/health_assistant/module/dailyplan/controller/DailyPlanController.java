package health_assistant.module.dailyplan.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.dailyplan.dto.MealAnalysisResponse;
import health_assistant.module.dailyplan.dto.LegacyMealAnalysisResponse;
import health_assistant.module.dailyplan.service.DailyPlanService;
import health_assistant.module.dailyplan.service.MealAnalysisService;
import health_assistant.utils.ClientUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/daily-plans")
@RequiredArgsConstructor
public class DailyPlanController {
    private final DailyPlanService dailyPlanService;
    private final MealAnalysisService mealAnalysisService;

    @GetMapping("/today")
    public ResponseEntity<DefaultRes<DailyPlanResponse>> today() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, dailyPlanService.today()));
    }

    @PostMapping("/today/generate")
    public ResponseEntity<DefaultRes<DailyPlanResponse>> generateToday() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, dailyPlanService.generateToday()));
    }

    @PostMapping(value = "/today/meals/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<LegacyMealAnalysisResponse>> analyzeMeal(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "Bữa ăn") String meal,
            @RequestParam(defaultValue = "") String plannedMeal) {
        MealAnalysisResponse analysis = mealAnalysisService.analyze(file, meal, plannedMeal);
        LegacyMealAnalysisResponse legacy = new LegacyMealAnalysisResponse(analysis.fitStatus(), analysis.summary(),
                analysis.suggestions(), analysis.knowledgeSources().stream().map(source -> source.title()).toList(), analysis.source());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, legacy));
    }
}
