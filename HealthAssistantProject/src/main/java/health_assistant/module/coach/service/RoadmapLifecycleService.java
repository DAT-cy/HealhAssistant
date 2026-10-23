package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import health_assistant.module.coach.dto.RoadmapResponse;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoadmapLifecycleService {
    private final UserProfileRepository profileRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPreviewService previewService;
    private final ObjectMapper objectMapper;

    @Transactional
    public RoadmapResponse activate(String previewId, int optionIndex) {
        return activate(previewId, optionIndex, null);
    }

    @Transactional
    public RoadmapResponse activate(String previewId, int optionIndex, String requestedTitle) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId).orElse(null);
        Instant profileVersion = profile == null ? Instant.EPOCH : profile.getUpdatedAt();
        GeminiRoadmapResponse selected = previewService.select(previewId, userId, profileVersion, optionIndex);
        RoadmapRecord previous = roadmapRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        String title = requestedTitle == null || requestedTitle.isBlank() ? selected.title() : requestedTitle.trim();
        return toResponse(createVersion(userId, previous, title, selected.overview(),
                selected.weeklyPlan(), selected.safetyNotes(), selected.source(),
                previous == null ? "INITIAL_PLAN" : "USER_CONFIRMED_NEW_PLAN",
                GeminiCoachService.PROMPT_VERSION, GeminiCoachService.SCHEMA_VERSION));
    }

    @Transactional
    public RoadmapResponse applyRecoveryAdjustment(Long baseRoadmapId, List<String> proposedWeeklyPlan) {
        Long userId = SecurityUtils.getCurrentUserId();
        UserProfile profile = profileRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy hồ sơ của tài khoản."));
        if (!profile.isConsent()) throw new IllegalArgumentException("Cần đồng ý sử dụng dữ liệu hồ sơ trước.");

        RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .orElseThrow(() -> new EntityNotFoundException("Không có lộ trình đang hoạt động."));
        if (!active.getId().equals(baseRoadmapId)) {
            throw new IllegalArgumentException("Lộ trình đã thay đổi. Hãy tạo lại đề xuất điều chỉnh.");
        }
        if (proposedWeeklyPlan == null || proposedWeeklyPlan.size() != active.getDurationWeeks()) {
            throw new IllegalArgumentException("Phương án điều chỉnh không khớp thời lượng lộ trình hiện tại.");
        }
        List<String> safetyNotes = readJson(active.getSafetyNotes());
        if (!safetyNotes.contains("Đây là đề xuất giảm tải dựa trên nhật ký tự khai báo, không phải chẩn đoán.")) {
            safetyNotes = new java.util.ArrayList<>(safetyNotes);
            safetyNotes.add("Đây là đề xuất giảm tải dựa trên nhật ký tự khai báo, không phải chẩn đoán.");
        }
        return toResponse(createVersion(userId, active, active.getTitle(), active.getOverview(),
                proposedWeeklyPlan, safetyNotes, "rule-adjustment", "USER_CONFIRMED_RECOVERY_ADJUSTMENT",
                "RULES_V1", "ROADMAP_ADJUSTMENT_V1"));
    }

    @Transactional(readOnly = true)
    public RoadmapResponse active() {
        Long userId = SecurityUtils.getCurrentUserId();
        return roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE")
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Tài khoản chưa có lộ trình đang hoạt động."));
    }

    @Transactional(readOnly = true)
    public List<RoadmapResponse> history() {
        Long userId = SecurityUtils.getCurrentUserId();
        return roadmapRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RoadmapResponse getMine(Long id) {
        return roadmapRepository.findByIdAndUserId(id, SecurityUtils.getCurrentUserId())
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu nội dung lộ trình.", exception);
        }
    }

    private RoadmapRecord createVersion(Long userId, RoadmapRecord previous, String title, String overview,
                                        List<String> weeklyPlan, List<String> safetyNotes, String source,
                                        String reason, String promptVersion, String schemaVersion) {
        long existingVersionCount = roadmapRepository.countByUserId(userId);
        if (previous != null && previous.getVersionNumber() == null) {
            previous.setVersionNumber(Math.toIntExact(existingVersionCount));
            roadmapRepository.save(previous);
        }
        roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").ifPresent(active -> {
            active.setStatus("ARCHIVED");
            roadmapRepository.save(active);
        });

        RoadmapRecord record = new RoadmapRecord();
        record.setUserId(userId);
        record.setTitle(title);
        record.setOverview(overview);
        record.setWeeklyPlan(writeJson(weeklyPlan));
        record.setSafetyNotes(writeJson(safetyNotes));
        record.setSource(source);
        record.setStatus("ACTIVE");
        record.setStartDate(LocalDate.now());
        record.setDurationWeeks(weeklyPlan.size());
        record.setVersionNumber(Math.toIntExact(existingVersionCount + 1));
        record.setPreviousRoadmapId(previous == null ? null : previous.getId());
        record.setChangeReason(reason);
        record.setPromptVersion(promptVersion);
        record.setSchemaVersion(schemaVersion);
        record.setCreatedAt(Instant.now());
        return roadmapRepository.save(record);
    }

    private List<String> readJson(String value) {
        try {
            return objectMapper.readValue(value, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Dữ liệu safety notes của lộ trình không hợp lệ.", exception);
        }
    }

    private RoadmapResponse toResponse(RoadmapRecord record) {
        return new RoadmapResponse(record.getId(), record.getTitle(), record.getOverview(), record.getWeeklyPlan(),
                record.getSafetyNotes(), record.getSource(), record.getStatus(), record.getStartDate(),
                record.getDurationWeeks(), record.getVersionNumber(), record.getPreviousRoadmapId(),
                record.getChangeReason(), record.getPromptVersion(), record.getSchemaVersion(), record.getCreatedAt());
    }
}
