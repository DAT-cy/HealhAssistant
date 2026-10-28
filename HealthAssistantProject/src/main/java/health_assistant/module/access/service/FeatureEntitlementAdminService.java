package health_assistant.module.access.service;

import health_assistant.module.access.dto.FeatureEntitlementResponse;
import health_assistant.module.access.dto.GrantFeatureEntitlementRequest;
import health_assistant.module.access.entity.FeatureEntitlement;
import health_assistant.module.access.repository.FeatureEntitlementRepository;
import health_assistant.module.users.repository.UserMapper;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class FeatureEntitlementAdminService {
    private static final java.util.Set<String> SUPPORTED_FEATURES = java.util.Set.of("AI_GYM_CAMERA", "AI_PLAN_RESCHEDULE", "AI_PERSONAL_ASSISTANT");
    private final FeatureEntitlementRepository repository;
    private final UserMapper userRepository;

    @Transactional
    public FeatureEntitlementResponse grant(GrantFeatureEntitlementRequest request) {
        if (!SUPPORTED_FEATURES.contains(request.featureCode())) throw new IllegalArgumentException("Mã tính năng Premium không được hỗ trợ.");
        userRepository.findByUserId(request.userId()).orElseThrow(() -> new EntityNotFoundException("Không tìm thấy tài khoản."));
        if (request.expiresAt() != null && !request.expiresAt().isAfter(Instant.now())) {
            throw new IllegalArgumentException("Thời điểm hết hạn phải ở tương lai.");
        }
        FeatureEntitlement entitlement = new FeatureEntitlement();
        entitlement.setUserId(request.userId());
        entitlement.setFeatureCode(request.featureCode());
        entitlement.setEnabled(true);
        entitlement.setStartsAt(Instant.now());
        entitlement.setExpiresAt(request.expiresAt());
        entitlement.setGrantReference(blankToNull(request.grantReference()));
        return toResponse(repository.save(entitlement));
    }

    @Transactional
    public FeatureEntitlementResponse revoke(Long id) {
        FeatureEntitlement entitlement = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy quyền Premium."));
        entitlement.setEnabled(false);
        entitlement.setRevokedAt(Instant.now());
        return toResponse(repository.save(entitlement));
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private FeatureEntitlementResponse toResponse(FeatureEntitlement value) {
        return new FeatureEntitlementResponse(value.getId(), value.getUserId(), value.getFeatureCode(), value.isEnabled(),
                value.getStartsAt(), value.getExpiresAt(), value.getRevokedAt(), value.getGrantReference());
    }
}
