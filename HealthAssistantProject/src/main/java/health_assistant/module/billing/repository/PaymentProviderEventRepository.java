package health_assistant.module.billing.repository;

import health_assistant.module.billing.entity.PaymentProviderEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PaymentProviderEventRepository extends JpaRepository<PaymentProviderEvent, Long> {
    boolean existsByProviderAndEventId(String provider, String eventId);
    java.util.Optional<PaymentProviderEvent> findByProviderAndEventId(String provider, String eventId);
    @Modifying
    @Transactional
    @Query(value = "INSERT IGNORE INTO payment_provider_events (provider,event_id,event_type,payload_sha256,status,received_at) VALUES (:provider,:eventId,:eventType,:hash,'RECEIVED',CURRENT_TIMESTAMP)", nativeQuery = true)
    int insertIfAbsent(@Param("provider") String provider, @Param("eventId") String eventId,
                       @Param("eventType") String eventType, @Param("hash") String payloadSha256);
}
