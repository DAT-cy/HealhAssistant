package health_assistant.module.progress.service;

import health_assistant.module.progress.dto.WeightLogRequest;
import health_assistant.module.progress.dto.WeightLogResponse;
import health_assistant.module.progress.entity.WeightLog;
import health_assistant.module.progress.repository.WeightLogRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeightLogService {
    private final WeightLogRepository repository;

    @Transactional
    public WeightLogResponse save(WeightLogRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        WeightLog log = repository.findByUserIdAndMeasuredOn(userId, request.measuredOn())
                .orElseGet(WeightLog::new);
        log.setUserId(userId);
        log.setMeasuredOn(request.measuredOn());
        log.setWeightKg(request.weightKg());
        log.setNote(request.note());
        return toResponse(repository.save(log));
    }

    @Transactional(readOnly = true)
    public List<WeightLogResponse> listMine(LocalDate from, LocalDate to) {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Cần truyền đồng thời from và to để lọc khoảng ngày.");
        }
        if (from != null && to.isBefore(from)) {
            throw new IllegalArgumentException("Ngày to không được trước ngày from.");
        }
        Long userId = SecurityUtils.getCurrentUserId();
        List<WeightLog> logs = from == null
                ? repository.findAllByUserIdOrderByMeasuredOnAsc(userId)
                : repository.findAllByUserIdAndMeasuredOnBetweenOrderByMeasuredOnAsc(userId, from, to);
        return logs.stream().map(this::toResponse).toList();
    }

    @Transactional
    public void deleteMine(Long id) {
        WeightLog log = repository.findByIdAndUserId(id, SecurityUtils.getCurrentUserId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy nhật ký cân nặng."));
        repository.delete(log);
    }

    private WeightLogResponse toResponse(WeightLog log) {
        return new WeightLogResponse(log.getId(), log.getMeasuredOn(), log.getWeightKg(), log.getNote(), log.getCreatedAt());
    }
}
