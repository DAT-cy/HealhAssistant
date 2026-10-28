package health_assistant.module.users.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "otp_challenges", indexes = {
        @Index(name = "idx_otp_owner_purpose_created", columnList = "email,purpose,created_at"),
        @Index(name = "idx_otp_expiry", columnList = "expires_at")
})
@Getter
@Setter
public class OtpChallenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(nullable = false, length = 20)
    private String purpose;
    @Column(name = "code_hash", nullable = false, length = 100)
    private String codeHash;
    @Column(name = "pending_password_hash", length = 100)
    private String pendingPasswordHash;
    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;
    @Column(nullable = false, length = 16)
    private String status = "PENDING";
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "consumed_at")
    private Instant consumedAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
