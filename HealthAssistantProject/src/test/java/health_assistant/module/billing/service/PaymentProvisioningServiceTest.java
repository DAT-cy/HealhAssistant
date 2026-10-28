package health_assistant.module.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.entity.FeatureEntitlement;
import health_assistant.module.access.repository.FeatureEntitlementRepository;
import health_assistant.module.billing.entity.BillingPlan;
import health_assistant.module.billing.entity.PaymentTransaction;
import health_assistant.module.billing.entity.UserSubscription;
import health_assistant.module.billing.repository.BillingPlanRepository;
import health_assistant.module.billing.repository.PaymentTransactionRepository;
import health_assistant.module.billing.repository.UserSubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentProvisioningServiceTest {
    @Mock PaymentTransactionRepository transactionRepository;
    @Mock BillingPlanRepository planRepository;
    @Mock UserSubscriptionRepository subscriptionRepository;
    @Mock FeatureEntitlementRepository entitlementRepository;
    @org.mockito.Spy ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks PaymentProvisioningService service;

    @Test
    void grantsOnlyServerConfiguredFeaturesAndIsIdempotent() {
        PaymentTransaction transaction = payment();
        BillingPlan plan = plan();
        when(transactionRepository.findByTransactionRefForUpdate("tx-1")).thenReturn(Optional.of(transaction));
        when(planRepository.findById("PREMIUM_30D")).thenReturn(Optional.of(plan));
        when(subscriptionRepository.findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(eq(8L), eq("ACTIVE"), any()))
                .thenReturn(Optional.empty());

        assertTrue(service.complete("tx-1", "capture-1", "COMPLETED"));
        assertEquals("PAID", transaction.getStatus());
        assertEquals("capture-1", transaction.getProviderPaymentId());
        verify(entitlementRepository, times(3)).save(any(FeatureEntitlement.class));
        ArgumentCaptor<UserSubscription> subscriptionCaptor = ArgumentCaptor.forClass(UserSubscription.class);
        verify(subscriptionRepository).save(subscriptionCaptor.capture());
        assertEquals(30 * 24 * 60 * 60L,
                subscriptionCaptor.getValue().getEndsAt().getEpochSecond() - subscriptionCaptor.getValue().getStartsAt().getEpochSecond());

        assertTrue(service.complete("tx-1", "capture-1", "COMPLETED"));
        verify(entitlementRepository, times(3)).save(any(FeatureEntitlement.class));
        verify(subscriptionRepository, times(1)).save(any(UserSubscription.class));
    }

    @Test
    void aRefundRevokesOnlyEntitlementsGrantedByThatTransaction() {
        PaymentTransaction transaction = payment(); transaction.setStatus("PAID"); transaction.setProviderPaymentId("capture-1");
        UserSubscription subscription = new UserSubscription(); subscription.setStatus("ACTIVE");
        FeatureEntitlement entitlement = new FeatureEntitlement(); entitlement.setEnabled(true);
        when(transactionRepository.findByProviderAndProviderPaymentId("PAYPAL", "capture-1")).thenReturn(Optional.of(transaction));
        when(transactionRepository.findByTransactionRefForUpdate("tx-1")).thenReturn(Optional.of(transaction));
        when(subscriptionRepository.findByPaymentTransactionId(10L)).thenReturn(Optional.of(subscription));
        when(entitlementRepository.findFirstByGrantReferenceAndFeatureCode(eq("tx-1"), anyString())).thenReturn(Optional.of(entitlement));

        service.refund("PAYPAL", "capture-1", null);

        assertEquals("REFUNDED", transaction.getStatus());
        assertEquals("REFUNDED", subscription.getStatus());
        assertFalse(entitlement.isEnabled());
        verify(entitlementRepository, times(3)).save(entitlement);
    }

    @Test
    void refundedTransactionCannotBeReactivatedByLatePaymentEvent() {
        PaymentTransaction transaction = payment(); transaction.setStatus("REFUNDED");
        when(transactionRepository.findByTransactionRefForUpdate("tx-1")).thenReturn(Optional.of(transaction));

        assertFalse(service.complete("tx-1", "capture-1", "COMPLETED"));
        verifyNoInteractions(planRepository, subscriptionRepository, entitlementRepository);
    }

    @Test
    void lateFailureEventDoesNotDowngradePaidTransaction() {
        PaymentTransaction transaction = payment(); transaction.setStatus("PAID");
        when(transactionRepository.findByTransactionRefForUpdate("tx-1")).thenReturn(Optional.of(transaction));

        service.fail("tx-1", "FAILED", "ASYNC_PAYMENT_FAILED");

        assertEquals("PAID", transaction.getStatus());
        verify(transactionRepository, never()).save(transaction);
    }

    private PaymentTransaction payment() {
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setId(10L); transaction.setTransactionRef("tx-1"); transaction.setUserId(8L);
        transaction.setPlanCode("PREMIUM_30D"); transaction.setProvider("PAYPAL");
        transaction.setStatus("PENDING"); transaction.setAmountMinor(499); transaction.setCurrency("USD");
        return transaction;
    }

    private BillingPlan plan() {
        BillingPlan plan = new BillingPlan(); plan.setCode("PREMIUM_30D"); plan.setDurationDays(30);
        plan.setFeaturesJson("[\"AI_PLAN_RESCHEDULE\",\"AI_PERSONAL_ASSISTANT\",\"AI_GYM_CAMERA\",\"MALICIOUS_FREE_FEATURE\"]");
        return plan;
    }
}
