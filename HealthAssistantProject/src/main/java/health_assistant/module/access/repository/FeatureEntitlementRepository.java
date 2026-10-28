package health_assistant.module.access.repository;

import health_assistant.module.access.entity.FeatureEntitlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeatureEntitlementRepository extends JpaRepository<FeatureEntitlement, Long> {
    java.util.Optional<FeatureEntitlement> findByIdAndFeatureCode(Long id, String featureCode);
    @Query("select count(e) > 0 from FeatureEntitlement e where e.userId = :userId and e.featureCode = :featureCode and e.enabled = true and e.revokedAt is null and e.startsAt <= :now and (e.expiresAt is null or e.expiresAt > :now)")
    boolean hasActiveEntitlement(@Param("userId") Long userId, @Param("featureCode") String featureCode, @Param("now") java.time.Instant now);
    java.util.Optional<FeatureEntitlement> findFirstByGrantReferenceAndFeatureCode(String grantReference, String featureCode);
}
