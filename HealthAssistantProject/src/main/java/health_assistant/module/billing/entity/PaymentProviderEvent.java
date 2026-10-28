package health_assistant.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "payment_provider_events", uniqueConstraints =
        @UniqueConstraint(name = "uk_payment_event_provider_id", columnNames = {"provider", "event_id"}))
@Getter
@Setter
public class PaymentProviderEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 12)
    private String provider;
    @Column(name = "event_id", nullable = false, length = 200)
    private String eventId;
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;
    @Column(name = "payload_sha256", nullable = false, length = 64)
    private String payloadSha256;
    @Column(nullable = false, length = 16)
    private String status = "RECEIVED";
    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;
    @Column(name = "processed_at")
    private Instant processedAt;
    @PrePersist void onCreate() { if (receivedAt == null) receivedAt = Instant.now(); }
}
