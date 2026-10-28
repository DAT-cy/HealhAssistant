package health_assistant.module.nutrition.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.dailyplan.dto.MealAnalysisResponse;
import health_assistant.module.nutrition.dto.MealLogResponse;
import health_assistant.module.nutrition.dto.MealReviewRequest;
import health_assistant.module.nutrition.entity.MealLog;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class MealLogService {
    private final MealLogRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public MealLogResponse recordReview(MealReviewRequest request) {
        MealLog log = new MealLog();
        log.setUserId(SecurityUtils.getCurrentUserId());
        log.setLoggedAt(LocalDateTime.now());
        log.setReviewedAt(LocalDateTime.now());
        log.setMealDate(LocalDate.now());
        log.setMealType(request.mealType());
        log.setStatus("REVIEWED");
        String notes = Stream.of(request.plannedMeal(), request.analysisSummary(), request.advice(), request.source())
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining("\n"));
        log.setNotes(notes.substring(0, Math.min(1000, notes.length())));
        return toResponse(repository.save(log));
    }

    @Transactional(readOnly = true)
    public List<MealLogResponse> listMine(LocalDate date) {
        LocalDate selectedDate = date == null ? LocalDate.now() : date;
        LocalDateTime from = selectedDate.atStartOfDay();
        LocalDateTime to = selectedDate.plusDays(1).atStartOfDay();
        return repository.findAllForUserAndDate(SecurityUtils.getCurrentUserId(), selectedDate, from, to).stream()
                .map(this::toResponse).toList();
    }

    public MealLogResponse toResponse(MealLog log) {
        return new MealLogResponse(log.getId(), log.getMealDate(), log.getLoggedAt(), log.getReviewedAt(), log.getMealType(), log.getStatus(),
                log.getPlannedMeal(), log.getDishName(), log.getPortionNotes(), log.getIngredients(), log.getPhotoUrl(),
                log.getNotes(), parseAnalysis(log.getAnalysisJson()), log.getRecommendationSource(),
                log.getRoadmapId(), log.getPlanDayIndex());
    }

    private MealAnalysisResponse parseAnalysis(String json) {
        if (json == null || json.isBlank()) return null;
        try { return objectMapper.readValue(json, MealAnalysisResponse.class); }
        catch (JsonProcessingException exception) { return null; }
    }
}
