package health_assistant.module.doctor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.doctor.dto.DoctorReviewRequestResponse;
import health_assistant.module.doctor.entity.DoctorReviewRequest;
import health_assistant.module.doctor.repository.DoctorReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Gắn nhận xét bác sĩ gần nhất + phương án AI vào response. */
@Component
@RequiredArgsConstructor
public class DoctorReviewResponseMapper {
    private final DoctorReviewRepository reviewRepository;
    private final ObjectMapper objectMapper;

    public DoctorReviewRequestResponse toResponse(DoctorReviewRequest request) {
        var latest = request.getId() == null ? null : reviewRepository.findFirstByRequestIdOrderByCreatedAtDescIdDesc(request.getId()).orElse(null);
        return DoctorReviewRequestResponse.from(request, latest, parse(request.getAiPlanJson()));
    }

    private JsonNode parse(String json) {
        if (json == null || json.isBlank()) return null;
        try { return objectMapper.readTree(json); } catch (Exception e) { return null; }
    }
}
