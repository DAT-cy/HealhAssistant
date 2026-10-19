package health_assistant.module.goals.service;

import health_assistant.module.goals.dto.HealthGoalRequest;
import health_assistant.module.goals.dto.HealthGoalResponse;
import health_assistant.module.goals.entity.HealthGoal;
import health_assistant.module.goals.repository.HealthGoalRepository;
import health_assistant.utils.SecurityUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HealthGoalService {
    private final HealthGoalRepository repository;

    @Transactional
    public HealthGoalResponse create(HealthGoalRequest request) {
        LocalDate startDate = request.startDate() == null ? LocalDate.now() : request.startDate();
        validateDates(startDate, request.targetDate());

        Long userId = SecurityUtils.getCurrentUserId();
        repository.findAllByUserIdAndStatus(userId, "ACTIVE")
                .forEach(goal -> goal.setStatus("PAUSED"));

        HealthGoal goal = new HealthGoal();
        goal.setUserId(userId);
        goal.setGoalType(request.goalType());
        goal.setStartWeightKg(request.startWeightKg());
        goal.setTargetWeightKg(request.targetWeightKg());
        goal.setStartDate(startDate);
        goal.setTargetDate(request.targetDate());
        goal.setNotes(request.notes());
        return toResponse(repository.save(goal));
    }

    @Transactional(readOnly = true)
    public List<HealthGoalResponse> listMine() {
        return repository.findAllByUserIdOrderByCreatedAtDesc(SecurityUtils.getCurrentUserId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public HealthGoalResponse updateStatus(Long id, String status) {
        Long userId = SecurityUtils.getCurrentUserId();
        HealthGoal goal = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy mục tiêu."));
        if ("ACTIVE".equals(status)) {
            repository.findAllByUserIdAndStatus(userId, "ACTIVE").stream()
                    .filter(existing -> !existing.getId().equals(id))
                    .forEach(existing -> existing.setStatus("PAUSED"));
        }
        goal.setStatus(status);
        return toResponse(repository.save(goal));
    }

    private void validateDates(LocalDate startDate, LocalDate targetDate) {
        if (targetDate != null && targetDate.isBefore(startDate)) {
            throw new IllegalArgumentException("Ngày mục tiêu không được trước ngày bắt đầu.");
        }
    }

    private HealthGoalResponse toResponse(HealthGoal goal) {
        return new HealthGoalResponse(goal.getId(), goal.getUserId(), goal.getGoalType(),
                goal.getStartWeightKg(), goal.getTargetWeightKg(), goal.getStartDate(),
                goal.getTargetDate(), goal.getStatus(), goal.getNotes(), goal.getCreatedAt(), goal.getUpdatedAt());
    }
}
