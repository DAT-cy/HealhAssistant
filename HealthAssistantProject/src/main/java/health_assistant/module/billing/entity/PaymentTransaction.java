package health_assistant.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "payment_transactions", indexes = {
        @Index(name = "idx_payment_user_created", columnList = "user_id,created_at"),
        @Index(name = "idx_payment_status", columnList = "status,updated_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_payment_provider_order", columnNames = {"provider", "provider_order_id"}),
        @UniqueConstraint(name = "uk_payment_provider_payment", columnNames = {"provider", "provider_payment_id"})
})
@Getter
@Setter
public class PaymentTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "transaction_ref", nullable = false, unique = true, length = 36)
    private String transactionRef;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "plan_code", nullable = false, length = 40)
    private String planCode;
    @Column(nullable = false, length = 12)
    private String provider;
    @Column(nullable = false, length = 24)
    private String status = "PENDING";
    @Column(name = "provider_status", length = 40)
    private String providerStatus;
    @Column(name = "provider_order_id", length = 160)
    private String providerOrderId;
    @Column(name = "provider_payment_id", length = 160)
    private String providerPaymentId;
    @Column(name = "provider_subscription_id", length = 160)
    private String providerSubscriptionId;
    @Column(name = "checkout_url", length = 1200)
    private String checkoutUrl;
    @Column(name = "amount_minor", nullable = false)
    private long amountMinor;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @Column(name = "paid_at")
    private Instant paidAt;
    @Column(name = "failure_code", length = 80)
    private String failureCode;
    @Version
    private Long rowVersion;
    @PrePersist void onCreate() { Instant now = Instant.now(); if (createdAt == null) createdAt = now; if (updatedAt == null) updatedAt = now; }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
