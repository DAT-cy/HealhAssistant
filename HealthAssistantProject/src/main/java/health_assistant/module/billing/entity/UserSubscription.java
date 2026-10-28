package health_assistant.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "user_subscriptions", indexes = @Index(name = "idx_subscription_user_status_end", columnList = "user_id,status,ends_at"))
@Getter
@Setter
public class UserSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "plan_code", nullable = false, length = 40)
    private String planCode;
    @Column(name = "payment_transaction_id", nullable = false, unique = true)
    private Long paymentTransactionId;
    @Column(nullable = false, length = 12)
    private String provider;
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;
    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Column(name = "refunded_at")
    private Instant refundedAt;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
