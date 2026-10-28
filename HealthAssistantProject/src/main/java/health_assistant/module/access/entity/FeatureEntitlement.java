package health_assistant.module.access.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "feature_entitlements", indexes = @Index(name = "idx_entitlement_user_feature", columnList = "user_id,feature_code,enabled,expires_at"))
@Getter
@Setter
public class FeatureEntitlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "feature_code", nullable = false, length = 50)
    private String featureCode;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "grant_reference", length = 120)
    private String grantReference;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @jakarta.persistence.PrePersist
    void onCreate() {
        if (startsAt == null) startsAt = Instant.now();
        if (createdAt == null) createdAt = Instant.now();
    }
}
