package health_assistant.module.billing.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.billing.config.BillingProperties;
import health_assistant.module.billing.dto.*;
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
import org.springframework.util.StringUtils;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingService {
    private final BillingPlanRepository planRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final UserSubscriptionRepository subscriptionRepository;
    private final BillingProperties properties;
    private final PaypalGateway paypalGateway;
    private final PaymentProvisioningService provisioningService;
    private final FeatureAccessService featureAccessService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<BillingPlanResponse> plans() {
        return planRepository.findAllByEnabledTrueOrderByPriceMinorAsc().stream().map(this::planResponse).toList();
    }

    @Transactional
    public CheckoutResponse createCheckout(Long userId, CheckoutRequest request) {
        BillingPlan plan = planRepository.findByCodeAndEnabledTrue(request.planCode())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy gói dịch vụ đang hoạt động."));
        if (plan.getPriceMinor() <= 0 || plan.getDurationDays() <= 0) throw new IllegalArgumentException("Gói này không có giao dịch thanh toán.");
        if (featureAccessService.hasFeature(userId, "AI_PERSONAL_ASSISTANT"))
            throw new IllegalStateException("Tài khoản đã có quyền Premium đang hoạt động.");

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setTransactionRef(UUID.randomUUID().toString()); transaction.setUserId(userId);
        transaction.setPlanCode(plan.getCode()); transaction.setProvider(request.provider());
        transaction.setStatus("PENDING"); transaction.setAmountMinor(plan.getPriceMinor()); transaction.setCurrency(plan.getCurrency());
        transaction = transactionRepository.saveAndFlush(transaction);

        String approvalUrl;
        try {
            if ("STRIPE".equals(request.provider())) approvalUrl = createStripeSession(transaction, plan);
            else approvalUrl = createPaypalOrder(transaction, plan);
        } catch (RuntimeException exception) {
            if ("PENDING".equals(transaction.getStatus())) {
                transaction.setStatus("FAILED"); transaction.setFailureCode("CHECKOUT_CREATE_FAILED"); transactionRepository.save(transaction);
            }
            throw exception;
        }
        return new CheckoutResponse(transaction.getTransactionRef(), transaction.getProvider(), transaction.getStatus(),
                approvalUrl, transaction.getAmountMinor(), transaction.getCurrency());
    }

    @Transactional(readOnly = true)
    public BillingStatusResponse status(Long userId) {
        UserSubscription current = subscriptionRepository.findFirstByUserIdAndStatusAndEndsAtAfterOrderByEndsAtDesc(userId, "ACTIVE", Instant.now()).orElse(null);
        boolean premium = featureAccessService.hasFeature(userId, "AI_PERSONAL_ASSISTANT");
        List<PaymentTransactionResponse> transactions = transactionRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::transactionResponse).toList();
        List<SubscriptionHistoryResponse> subscriptions = subscriptionRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(item -> new SubscriptionHistoryResponse(item.getId(), item.getPlanCode(), item.getProvider(),
                        "ACTIVE".equals(item.getStatus()) && !item.getEndsAt().isAfter(Instant.now()) ? "EXPIRED" : item.getStatus(),
                        item.getStartsAt(), item.getEndsAt(), item.getCancelledAt(), item.getRefundedAt())).toList();
        return new BillingStatusResponse(premium ? "PREMIUM" : "FREE", current == null ? (premium ? "ACTIVE" : "FREE") : current.getStatus(),
                current == null ? null : current.getPlanCode(), current == null ? null : current.getStartsAt(),
                current == null ? null : current.getEndsAt(), premium, subscriptions, transactions);
    }

    @Transactional(readOnly = true)
    public PaymentTransactionResponse transaction(Long userId, String transactionRef) {
        return transactionResponse(transactionRepository.findByTransactionRefAndUserId(transactionRef, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch của tài khoản này.")));
    }

    @Transactional
    public PaymentTransactionResponse capturePaypal(Long userId, String transactionRef) {
        PaymentTransaction transaction = transactionRepository.findByTransactionRefAndUserIdForUpdate(transactionRef, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy giao dịch của tài khoản này."));
        if (!"PAYPAL".equals(transaction.getProvider())) throw new IllegalArgumentException("Giao dịch này không thuộc PayPal.");
        if ("PAID".equals(transaction.getStatus())) return transactionResponse(transaction);
        if (!"PENDING".equals(transaction.getStatus()) || !StringUtils.hasText(transaction.getProviderOrderId()))
            throw new IllegalStateException("Giao dịch không còn ở trạng thái có thể capture.");
        JsonNode capture;
        try { capture = paypalGateway.captureOrder(transaction.getProviderOrderId()); }
        catch (org.springframework.web.reactive.function.client.WebClientResponseException exception) {
            transaction.setProviderStatus("NOT_APPROVED_OR_CAPTURE_FAILED"); transactionRepository.save(transaction);
            return transactionResponse(transaction);
        }
        if (!paypalGateway.captureIsPaid(capture, transaction)) {
            provisioningService.fail(transactionRef, capture == null ? "UNKNOWN" : capture.path("status").asText("UNKNOWN"), "CAPTURE_NOT_COMPLETED");
            throw new IllegalStateException("PayPal chưa xác nhận capture thành công; Premium chưa được kích hoạt.");
        }
        String captureId = capture.path("purchase_units").path(0).path("payments").path("captures").path(0).path("id").asText(null);
        provisioningService.complete(transactionRef, captureId, "COMPLETED");
        return transaction(transaction.getUserId(), transactionRef);
    }

    private String createStripeSession(PaymentTransaction transaction, BillingPlan plan) {
        if (!StringUtils.hasText(properties.getStripeSecretKey())) throw new IllegalStateException("Stripe sandbox secret key chưa được cấu hình ở backend.");
        boolean sandbox = "sandbox".equalsIgnoreCase(properties.getMode());
        if ((sandbox && !properties.getStripeSecretKey().startsWith("sk_test_"))
                || (!sandbox && !properties.getStripeSecretKey().startsWith("sk_live_")))
            throw new IllegalStateException("Stripe secret key không khớp BILLING_MODE.");
        if (!sandbox && !"https://api.stripe.com".equals(properties.getStripeApiBase()))
            throw new IllegalStateException("Production chỉ được gọi Stripe API chính thức.");
        try {
            SessionCreateParams.LineItem.PriceData.ProductData product = SessionCreateParams.LineItem.PriceData.ProductData.builder()
                    .setName(plan.getName()).build();
            SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency(plan.getCurrency().toLowerCase(java.util.Locale.ROOT))
                    .setUnitAmount(transaction.getAmountMinor()).setProductData(product).build();
            SessionCreateParams.LineItem item = SessionCreateParams.LineItem.builder().setQuantity(1L).setPriceData(priceData).build();
            SessionCreateParams params = SessionCreateParams.builder().setMode(SessionCreateParams.Mode.PAYMENT)
                    .addLineItem(item).setSuccessUrl(returnUrl(transaction.getTransactionRef(), "stripe", "success"))
                    .setCancelUrl(returnUrl(transaction.getTransactionRef(), "stripe", "cancelled"))
                    .putMetadata("transaction_ref", transaction.getTransactionRef())
                    .putMetadata("user_id", transaction.getUserId().toString()).build();
            StripeClient client = StripeClient.builder().setApiKey(properties.getStripeSecretKey())
                    .setApiBase(properties.getStripeApiBase()).build();
            Session session = client.v1().checkout().sessions().create(params);
            if (!StringUtils.hasText(session.getUrl())) throw new IllegalStateException("Stripe did not return a Checkout URL.");
            transaction.setProviderOrderId(session.getId()); transaction.setCheckoutUrl(session.getUrl());
            transaction.setProviderStatus(session.getStatus()); transactionRepository.save(transaction);
            return session.getUrl();
        } catch (StripeException exception) {
            transaction.setStatus("FAILED"); transaction.setFailureCode("STRIPE_SESSION_CREATE_FAILED");
            transactionRepository.save(transaction);
            throw new IllegalStateException("Không tạo được Stripe Checkout Session.");
        }
    }

    private String createPaypalOrder(PaymentTransaction transaction, BillingPlan plan) {
        JsonNode order = paypalGateway.createOrder(transaction, plan);
        String approvalUrl = paypalGateway.approvalUrl(order);
        transaction.setProviderOrderId(order.path("id").asText()); transaction.setCheckoutUrl(approvalUrl);
        transaction.setProviderStatus(order.path("status").asText("CREATED")); transactionRepository.save(transaction);
        return approvalUrl;
    }

    private BillingPlanResponse planResponse(BillingPlan plan) {
        return new BillingPlanResponse(plan.getCode(), plan.getName(), plan.getPriceMinor(), plan.getCurrency(),
                plan.getDurationDays(), features(plan));
    }
    private List<String> features(BillingPlan plan) {
        try { return objectMapper.readValue(plan.getFeaturesJson(), new TypeReference<>() {}); }
        catch (Exception exception) { return List.of(); }
    }
    private PaymentTransactionResponse transactionResponse(PaymentTransaction transaction) {
        return new PaymentTransactionResponse(transaction.getTransactionRef(), transaction.getPlanCode(), transaction.getProvider(),
                transaction.getStatus(), transaction.getProviderStatus(), transaction.getAmountMinor(), transaction.getCurrency(),
                transaction.getCreatedAt(), transaction.getPaidAt());
    }
    private String returnUrl(String ref, String provider, String result) {
        String separator = properties.getReturnUrl().contains("?") ? "&" : "?";
        return properties.getReturnUrl() + separator + "transactionRef=" + ref + "&provider=" + provider + "&result=" + result;
    }
}
