package health_assistant.module.billing.repository;

import health_assistant.module.billing.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    Optional<PaymentTransaction> findByTransactionRefAndUserId(String transactionRef, Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentTransaction p where p.transactionRef = :ref and p.userId = :userId")
    Optional<PaymentTransaction> findByTransactionRefAndUserIdForUpdate(@Param("ref") String ref, @Param("userId") Long userId);
    Optional<PaymentTransaction> findByProviderAndProviderOrderId(String provider, String providerOrderId);
    Optional<PaymentTransaction> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);
    List<PaymentTransaction> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentTransaction p where p.transactionRef = :ref")
    Optional<PaymentTransaction> findByTransactionRefForUpdate(@Param("ref") String ref);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PaymentTransaction p where p.provider = :provider and p.providerOrderId = :orderId")
    Optional<PaymentTransaction> findByProviderOrderForUpdate(@Param("provider") String provider, @Param("orderId") String orderId);
}
