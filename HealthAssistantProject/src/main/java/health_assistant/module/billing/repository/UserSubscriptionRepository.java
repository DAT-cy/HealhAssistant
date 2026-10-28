package health_assistant.module.billing.repository;

import health_assistant.module.billing.entity.UserSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    Optional<UserSubscription> findByPaymentTransactionId(Long paymentTransactionId);
    Optional<UserSubscription> findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(Long userId, String status, Instant now);
    List<UserSubscription> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
