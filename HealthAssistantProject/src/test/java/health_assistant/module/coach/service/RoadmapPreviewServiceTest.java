package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.entity.RoadmapPreview;
import health_assistant.module.coach.repository.RoadmapPreviewRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class RoadmapPreviewServiceTest {
    private final RoadmapPreviewRepository repository = mock(RoadmapPreviewRepository.class);
    private final RoadmapPreviewService service = new RoadmapPreviewService(repository, new ObjectMapper().registerModule(new JavaTimeModule()));
    private final Instant profileUpdatedAt = Instant.parse("2026-10-01T10:00:00Z");

    @Test
    void storesThreeVerboseRoadmapOptionsWithoutApplicationTruncation() {
        String longDescription = "Recovery and gradual progression. ".repeat(30);
        List<GeminiRoadmapResponse> options = new ArrayList<>();
        for (int index = 1; index <= 3; index++) {
            options.add(new GeminiRoadmapResponse("Plan " + index, longDescription,
                    List.of(longDescription, longDescription), List.of(longDescription), "gemini"));
        }

        service.create(41L, profileUpdatedAt, options);

        var captor = org.mockito.ArgumentCaptor.forClass(RoadmapPreview.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getOptionsJson()).hasSizeGreaterThan(255);
        assertThat(captor.getValue().getOptionsJson()).contains(longDescription);
    }

    @Test
    void onlyReturnsAnOptionFromTheOwnedUnchangedPreview() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().plusSeconds(60));
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        GeminiRoadmapResponse selected = service.select("preview-id", 41L, profileUpdatedAt, 1);

        assertThat(selected.title()).isEqualTo("Plan 2");
        verify(repository).findByIdAndUserIdForUpdate("preview-id", 41L);
    }

    @Test
    void returnsTheScheduleBoundToTheOwnedPreview() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().plusSeconds(60));
        preview.setScheduleJson("[{\"dayOfWeek\":1,\"sessionPeriod\":\"MORNING\",\"startTime\":\"06:00\",\"endTime\":\"07:00\",\"activityType\":\"RUNNING\",\"activity\":\"Chạy nhẹ\"}]");
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        RoadmapPreviewService.Selection selected = service.selectWithSchedule("preview-id", 41L, profileUpdatedAt, 0);

        assertThat(selected.schedule()).hasSize(1);
        assertThat(selected.schedule().get(0).dayOfWeek()).isEqualTo(1);
        assertThat(selected.schedule().get(0).startTime()).isEqualTo(java.time.LocalTime.of(6, 0));
    }

    @Test
    void rejectsPreviewOwnedByAnotherUser() {
        when(repository.findByIdAndUserIdForUpdate("preview-id", 99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.select("preview-id", 99L, profileUpdatedAt, 0))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void rejectsPreviewWhenProfileHasChanged() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().plusSeconds(60));
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        assertThatThrownBy(() -> service.select("preview-id", 41L, profileUpdatedAt.plusSeconds(1), 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hồ sơ đã thay đổi");
    }

    @Test
    void rejectsExpiredPreviewAndDeletesIt() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().minusSeconds(1));
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        assertThatThrownBy(() -> service.select("preview-id", 41L, profileUpdatedAt, 0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("hết hạn");
        verify(repository).delete(preview);
    }

    @Test
    void rejectsOptionOutsideThePreview() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().plusSeconds(60));
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        assertThatThrownBy(() -> service.select("preview-id", 41L, profileUpdatedAt, 3))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("không hợp lệ");
    }

    @Test
    void rejectsPreviewThatWasAlreadyActivated() {
        RoadmapPreview preview = preview(41L, profileUpdatedAt, Instant.now().plusSeconds(60));
        preview.setConsumedAt(Instant.now().minusSeconds(1));
        when(repository.findByIdAndUserIdForUpdate("preview-id", 41L)).thenReturn(Optional.of(preview));

        assertThatThrownBy(() -> service.select("preview-id", 41L, profileUpdatedAt, 0))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("đã được sử dụng");
        verify(repository, never()).save(any());
    }

    private RoadmapPreview preview(Long userId, Instant updatedAt, Instant expiresAt) {
        RoadmapPreview preview = new RoadmapPreview();
        preview.setId("preview-id");
        preview.setUserId(userId);
        preview.setProfileUpdatedAt(updatedAt);
        preview.setExpiresAt(expiresAt);
        preview.setOptionsJson("""
                [{"title":"Plan 1","overview":"One","weeklyPlan":["Week 1"],"safetyNotes":["Stop"],"source":"fallback"},
                 {"title":"Plan 2","overview":"Two","weeklyPlan":["Week 1"],"safetyNotes":["Stop"],"source":"fallback"},
                 {"title":"Plan 3","overview":"Three","weeklyPlan":["Week 1"],"safetyNotes":["Stop"],"source":"fallback"}]
                """);
        return preview;
    }
}
