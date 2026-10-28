package health_assistant.module.access.service;

import health_assistant.module.access.repository.FeatureEntitlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class FeatureAccessService {
    private final FeatureEntitlementRepository repository;

    public boolean hasFeature(Long userId, String featureCode) {
        return repository.hasActiveEntitlement(userId, featureCode, Instant.now());
    }

    public void requireFeature(Long userId, String featureCode) {
        if (!hasFeature(userId, featureCode)) {
            String message = "AI_GYM_CAMERA".equals(featureCode)
                    ? "Tính năng huấn luyện camera AI là quyền Premium và chưa được cấp cho tài khoản này."
                    : "Quyền Premium cần thiết chưa được cấp cho tính năng này.";
            throw new AccessDeniedException(message);
        }
    }
}
