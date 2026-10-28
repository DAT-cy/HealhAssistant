package health_assistant.module.dailyplan.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.ai.service.GeminiClient;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MealAnalysisServiceTest {
    private final GeminiClient gemini = mock(GeminiClient.class);
    private final KnowledgeChunkRepository chunks = mock(KnowledgeChunkRepository.class);
    private final MealAnalysisService service = new MealAnalysisService(gemini, chunks, new ObjectMapper());

    @Test
    void returnsGeneralAiSourceAndNoNutritionNumbersWhenNoKnowledgeOrEstimateExists() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(chunks.findApprovedNutritionChunks(any(Pageable.class))).thenReturn(List.of());
        when(gemini.generateJson(anyString(), any(), eq("image/png"), anyString())).thenReturn("""
                {"fitStatus":"INSUFFICIENT_DATA","identifiedFoods":[],"summary":"Ảnh chưa đủ rõ.",
                 "positiveAspects":[],"concerns":["Không thể nhận diện món."],"suggestions":["Nhập tên món."],
                 "nutritionEstimate":{"available":false,"caloriesMin":0,"caloriesMax":0,"proteinMinG":0,"proteinMaxG":0,
                  "carbohydratesMinG":0,"carbohydratesMaxG":0,"fatMinG":0,"fatMaxG":0,"confidence":"LOW","uncertainty":"Không đủ dữ liệu."},
                 "confidence":"LOW","needsMoreInfo":true,"knowledgeSources":[]}
                """);

        var result = service.analyze(image(), context());

        assertThat(result.source()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(result.knowledgeSources()).isEmpty();
        assertThat(result.nutritionEstimate().available()).isFalse();
        assertThat(result.nutritionEstimate().caloriesMin()).isNull();
        assertThat(result.needsMoreInfo()).isTrue();
    }

    @Test
    void mealRecommendationsCannotShowNumericTargetsWithoutCitedKnowledge() throws Exception {
        when(gemini.isConfigured()).thenReturn(true);
        when(chunks.findApprovedNutritionChunks(any(Pageable.class))).thenReturn(List.of());
        when(gemini.generateJson(anyString(), any())).thenReturn("""
                {"suggestedMeal":"Gợi ý cân bằng theo bữa.","nutritionTargetAvailable":true,"nutritionTarget":"500 kcal",
                 "prioritizeFoods":["Rau"],"limitFoods":[],"reasons":["Phù hợp lịch."],"limitationNote":"Ước tính chung.","knowledgeSources":[]}
                """);

        var result = service.recommend(context());

        assertThat(result.source()).isEqualTo("GENERAL_AI");
        assertThat(result.nutritionTargetAvailable()).isFalse();
        assertThat(result.nutritionTarget()).isEmpty();
    }

    private MockMultipartFile image() throws Exception {
        BufferedImage source = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(source, "png", bytes);
        return new MockMultipartFile("file", "meal.png", "image/png", bytes.toByteArray());
    }

    private MealAnalysisService.MealContext context() {
        return new MealAnalysisService.MealContext("BREAKFAST", LocalDate.of(2026, 10, 27), "", "", "", "",
                "", "", "", "", List.of());
    }
}
