package health_assistant.module.users.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "auth_identities", uniqueConstraints = {
        @UniqueConstraint(name = "uk_auth_identity_provider_subject", columnNames = {"provider", "provider_subject"}),
        @UniqueConstraint(name = "uk_auth_identity_user_provider", columnNames = {"user_id", "provider"})
})
@Getter
@Setter
public class AuthIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 255)
    private String providerSubject;

    @Column(name = "provider_email", nullable = false, length = 254)
    private String providerEmail;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        lastLoginAt = now;
    }
}
