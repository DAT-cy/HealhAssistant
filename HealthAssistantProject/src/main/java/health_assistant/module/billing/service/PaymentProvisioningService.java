package health_assistant.module.billing.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.entity.FeatureEntitlement;
import health_assistant.module.access.repository.FeatureEntitlementRepository;
import health_assistant.module.billing.entity.BillingPlan;
import health_assistant.module.billing.entity.PaymentTransaction;
import health_assistant.module.billing.entity.UserSubscription;
import health_assistant.module.billing.repository.BillingPlanRepository;
import health_assistant.module.billing.repository.PaymentTransactionRepository;
import health_assistant.module.billing.repository.UserSubscriptionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PaymentProvisioningService {
    private static final Set<String> SUPPORTED_FEATURES = Set.of("AI_GYM_CAMERA", "AI_PLAN_RESCHEDULE", "AI_PERSONAL_ASSISTANT");
    private final PaymentTransactionRepository transactionRepository;
    private final BillingPlanRepository planRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final FeatureEntitlementRepository entitlementRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public boolean complete(String transactionRef, String paymentId, String providerStatus) {
        PaymentTransaction transaction = transactionRepository.findByTransactionRefForUpdate(transactionRef)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch thanh toán."));
        if ("PAID".equals(transaction.getStatus())) return true;
        if ("REFUNDED".equals(transaction.getStatus())) return false;
        BillingPlan plan = planRepository.findById(transaction.getPlanCode())
                .orElseThrow(() -> new EntityNotFoundException("Gói dịch vụ của giao dịch không còn tồn tại."));

        Instant now = Instant.now();
        Instant startsAt = subscriptionRepository.findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(transaction.getUserId(), "ACTIVE", now)
                .map(UserSubscription::getEndsAt).orElse(now);
        Instant endsAt = startsAt.plusSeconds(Math.multiplyExact(plan.getDurationDays(), 86_400L));
        transaction.setStatus("PAID"); transaction.setProviderStatus(providerStatus);
        transaction.setProviderPaymentId(paymentId); transaction.setPaidAt(now); transactionRepository.save(transaction);

        UserSubscription subscription = new UserSubscription();
        subscription.setUserId(transaction.getUserId()); subscription.setPlanCode(plan.getCode());
        subscription.setPaymentTransactionId(transaction.getId()); subscription.setProvider(transaction.getProvider());
        subscription.setStatus("ACTIVE"); subscription.setStartsAt(startsAt); subscription.setEndsAt(endsAt);
        subscriptionRepository.save(subscription);
        for (String code : features(plan)) {
            if (!SUPPORTED_FEATURES.contains(code)) continue;
            FeatureEntitlement entitlement = new FeatureEntitlement();
            entitlement.setUserId(transaction.getUserId()); entitlement.setFeatureCode(code); entitlement.setEnabled(true);
            entitlement.setStartsAt(startsAt); entitlement.setExpiresAt(endsAt); entitlement.setGrantReference(transaction.getTransactionRef());
            entitlementRepository.save(entitlement);
        }
        return true;
    }

    @Transactional
    public void fail(String transactionRef, String providerStatus, String failureCode) {
        transactionRepository.findByTransactionRefForUpdate(transactionRef).ifPresent(transaction -> {
            if (!"PAID".equals(transaction.getStatus()) && !"REFUNDED".equals(transaction.getStatus())) {
                transaction.setStatus("FAILED"); transaction.setProviderStatus(providerStatus);
                transaction.setFailureCode(failureCode); transactionRepository.save(transaction);
            }
        });
    }

    @Transactional
    public void expire(String transactionRef) { closePending(transactionRef, "EXPIRED", "CHECKOUT_EXPIRED"); }

    @Transactional
    public void cancel(Long userId, String transactionRef) {
        PaymentTransaction transaction = transactionRepository.findByTransactionRefAndUserIdForUpdate(transactionRef, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch của tài khoản này."));
        if ("PENDING".equals(transaction.getStatus())) {
            transaction.setStatus("CANCELLED"); transaction.setProviderStatus("CANCELLED_BY_USER"); transactionRepository.save(transaction);
        }
    }

    private void closePending(String transactionRef, String status, String reason) {
        transactionRepository.findByTransactionRefForUpdate(transactionRef).ifPresent(transaction -> {
            if ("PENDING".equals(transaction.getStatus())) {
                transaction.setStatus(status); transaction.setFailureCode(reason); transactionRepository.save(transaction);
            }
        });
    }

    @Transactional
    public void refund(String provider, String paymentId, String orderId) {
        PaymentTransaction transaction = transactionRepository.findByProviderAndProviderPaymentId(provider, paymentId)
                .or(() -> orderId == null ? java.util.Optional.empty() : transactionRepository.findByProviderAndProviderOrderId(provider, orderId))
                .flatMap(item -> transactionRepository.findByTransactionRefForUpdate(item.getTransactionRef()))
                .orElse(null);
        if (transaction == null || "REFUNDED".equals(transaction.getStatus())) return;
        transaction.setStatus("REFUNDED"); transaction.setProviderStatus("REFUNDED"); transactionRepository.save(transaction);
        subscriptionRepository.findByPaymentTransactionId(transaction.getId()).ifPresent(subscription -> {
            subscription.setStatus("REFUNDED"); subscription.setRefundedAt(Instant.now()); subscriptionRepository.save(subscription);
        });
        for (String code : List.of("AI_GYM_CAMERA", "AI_PLAN_RESCHEDULE", "AI_PERSONAL_ASSISTANT")) {
            entitlementRepository.findFirstByGrantReferenceAndFeatureCode(transaction.getTransactionRef(), code).ifPresent(entitlement -> {
                entitlement.setEnabled(false); entitlement.setRevokedAt(Instant.now()); entitlementRepository.save(entitlement);
            });
        }
    }

    private List<String> features(BillingPlan plan) {
        try { return objectMapper.readValue(plan.getFeaturesJson(), new TypeReference<>() {}); }
        catch (Exception exception) { throw new IllegalStateException("Danh sách tính năng của gói không hợp lệ."); }
    }
}
