package health_assistant.module.nutrition.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.dailyplan.dto.MealAnalysisResponse;
import health_assistant.module.dailyplan.dto.MealNutritionEstimate;
import health_assistant.module.dailyplan.service.MealAnalysisService;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.module.nutrition.dto.MealAnalysisRequest;
import health_assistant.module.nutrition.entity.MealLog;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.repository.UserProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NutritionMealServiceTest {
    private final MealAnalysisService ai = mock(MealAnalysisService.class);
    private final MealLogRepository mealRepository = mock(MealLogRepository.class);
    private final RoadmapRecordRepository roadmapRepository = mock(RoadmapRecordRepository.class);
    private final RoadmapPlanSlotRepository slotRepository = mock(RoadmapPlanSlotRepository.class);
    private final CloudinaryUploadService cloudinary = mock(CloudinaryUploadService.class);
    private final UserProfileRepository profileRepository = mock(UserProfileRepository.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final MealLogService mealLogService = new MealLogService(mealRepository, mapper);
    private final NutritionMealService service = new NutritionMealService(ai, mealRepository, mealLogService,
            profileRepository, roadmapRepository, slotRepository, cloudinary, mapper);

    @Test
    void analysisLogIsBoundToTheAuthenticatedOwnerAndSelectedRoadmapDay() {
        Long userId = 31L;
        RoadmapRecord roadmap = new RoadmapRecord();
        roadmap.setId(8L);
        roadmap.setUserId(userId);
        roadmap.setStatus("ACTIVE");
        roadmap.setStartDate(LocalDate.of(2026, 10, 26));
        roadmap.setDurationWeeks(4);
        when(roadmapRepository.findByIdAndUserId(8L, userId)).thenReturn(Optional.of(roadmap));
        when(slotRepository.findAllByRoadmap_IdAndDayIndexOrderByStartTimeAsc(8L, 1)).thenReturn(List.of());
        when(cloudinary.uploadMealPhoto(eq(userId), any())).thenReturn(
                new CloudinaryUploadService.UploadedMealPhoto("https://cdn.example/meal.png", "health-assistant/meal-photos/user-31/id"));
        when(ai.analyze(any(), any())).thenReturn(new MealAnalysisResponse("ADJUST", List.of(), "Có thể thêm rau.",
                List.of(), List.of(), List.of("Thêm rau xanh."), new MealNutritionEstimate(false, null, null, null, null,
                null, null, null, null, "LOW", "Không đủ dữ liệu."), "LOW", true, List.of(), "GENERAL_AI"));
        when(mealRepository.saveAndFlush(any(MealLog.class))).thenAnswer(invocation -> {
            MealLog saved = invocation.getArgument(0);
            saved.setId(44L);
            return saved;
        });
        MealAnalysisRequest request = new MealAnalysisRequest("LUNCH", LocalDate.of(2026, 10, 27), 8L, 1,
                "Bữa trưa cân bằng", "Cơm gà", "1 phần", "Gà, cơm, rau");

        var result = service.analyze(userId, new MockMultipartFile("file", "meal.png", "image/png", new byte[] { 1 }), request);

        assertThat(result.meal().id()).isEqualTo(44L);
        assertThat(result.meal().status()).isEqualTo("ANALYZED");
        assertThat(result.meal().mealDate()).isEqualTo(request.mealDate());
        assertThat(result.meal().roadmapId()).isEqualTo(8L);
        assertThat(result.meal().planDayIndex()).isEqualTo(1);
        assertThat(result.meal().photoUrl()).isEqualTo("https://cdn.example/meal.png");
        assertThat(result.analysis().fitStatus()).isEqualTo("ADJUST");
        verify(cloudinary).uploadMealPhoto(eq(userId), any());
    }

    @Test
    void cannotAttachMealToAnotherUsersRoadmap() {
        when(roadmapRepository.findByIdAndUserId(8L, 31L)).thenReturn(Optional.empty());
        MealAnalysisRequest request = new MealAnalysisRequest("LUNCH", LocalDate.of(2026, 10, 27), 8L, 1,
                null, null, null, null);

        assertThatThrownBy(() -> service.analyze(31L, new MockMultipartFile("file", new byte[] { 1 }), request))
                .isInstanceOf(EntityNotFoundException.class);
        verifyNoInteractions(ai, cloudinary);
    }
}
