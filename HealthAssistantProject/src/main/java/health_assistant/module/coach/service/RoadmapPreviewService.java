package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapPreviewResponse;
import health_assistant.module.coach.entity.RoadmapPreview;
import health_assistant.module.coach.repository.RoadmapPreviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoadmapPreviewService {
    private static final int OPTION_COUNT = 3;
    private final RoadmapPreviewRepository repository;
    private final ObjectMapper objectMapper;

    public RoadmapPreviewResponse create(Long userId, Instant profileUpdatedAt, List<GeminiRoadmapResponse> options) {
        if (options.size() != OPTION_COUNT) throw new IllegalArgumentException("Cần tạo đủ ba phương án lộ trình.");
        RoadmapPreview preview = new RoadmapPreview();
        preview.setId(UUID.randomUUID().toString());
        preview.setUserId(userId);
        preview.setProfileUpdatedAt(profileUpdatedAt);
        preview.setOptionsJson(write(options));
        preview.setExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
        repository.save(preview);
        return new RoadmapPreviewResponse(preview.getId(), options);
    }

    public GeminiRoadmapResponse select(String previewId, Long userId, Instant currentProfileUpdatedAt, int optionIndex) {
        RoadmapPreview preview = repository.findByIdAndUserIdForUpdate(previewId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy bản xem trước của tài khoản này."));
        if (preview.getConsumedAt() != null) {
            throw new IllegalArgumentException("Bản xem trước đã được sử dụng. Hãy tạo phương án mới nếu muốn thay đổi.");
        }
        if (!preview.getExpiresAt().isAfter(Instant.now())) {
            repository.delete(preview);
            throw new IllegalArgumentException("Bản xem trước đã hết hạn. Hãy tạo lại các phương án.");
        }
        if (!preview.getProfileUpdatedAt().equals(currentProfileUpdatedAt)) {
            throw new IllegalArgumentException("Hồ sơ đã thay đổi. Hãy tạo lại bản xem trước trước khi kích hoạt.");
        }
        List<GeminiRoadmapResponse> options = read(preview.getOptionsJson());
        if (optionIndex < 0 || optionIndex >= options.size()) throw new IllegalArgumentException("Phương án được chọn không hợp lệ.");
        preview.setConsumedAt(Instant.now());
        repository.save(preview);
        return options.get(optionIndex);
    }

    private String write(List<GeminiRoadmapResponse> options) {
        try { return objectMapper.writeValueAsString(options); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Không thể lưu bản xem trước.", exception); }
    }

    private List<GeminiRoadmapResponse> read(String json) {
        try { return objectMapper.readValue(json, new TypeReference<>() { }); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Dữ liệu bản xem trước không hợp lệ.", exception); }
    }
}
