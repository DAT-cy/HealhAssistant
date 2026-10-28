package health_assistant.module.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import health_assistant.module.billing.config.BillingProperties;
import health_assistant.module.billing.entity.PaymentTransaction;
import health_assistant.module.billing.repository.PaymentProviderEventRepository;
import health_assistant.module.billing.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PaymentWebhookService {
    private final BillingProperties properties;
    private final PaypalGateway paypalGateway;
    private final PaymentProviderEventRepository eventRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final PaymentProvisioningService provisioningService;
    private final ObjectMapper objectMapper;

    @Transactional
    public boolean stripe(String payload, String signature) {
        if (!StringUtils.hasText(properties.getStripeWebhookSecret())) throw new IllegalStateException("Stripe webhook secret is not configured.");
        Event event;
        try { event = Webhook.constructEvent(payload, signature, properties.getStripeWebhookSecret()); }
        catch (Exception exception) { throw new IllegalArgumentException("Stripe webhook signature is invalid."); }
        JsonNode root = read(payload);
        if (!recordOnce("STRIPE", event.getId(), event.getType(), payload)) return true;
        JsonNode object = root.path("data").path("object");
        switch (event.getType()) {
            case "checkout.session.completed", "checkout.session.async_payment_succeeded" -> completeStripeSession(object);
            case "checkout.session.async_payment_failed" -> {
                String ref = object.path("metadata").path("transaction_ref").asText(null);
                if (ref != null) provisioningService.fail(ref, object.path("payment_status").asText(event.getType()), event.getType().toUpperCase(Locale.ROOT));
            }
            case "checkout.session.expired" -> {
                String ref = object.path("metadata").path("transaction_ref").asText(null);
                if (ref != null) provisioningService.expire(ref);
            }
            case "charge.refunded" -> {
                String paymentIntentId = object.path("payment_intent").asText(null);
                if (paymentIntentId != null && object.path("amount_refunded").asLong(-1) >= object.path("amount").asLong(Long.MAX_VALUE))
                    provisioningService.refund("STRIPE", paymentIntentId, null);
            }
            default -> { }
        }
        markProcessed("STRIPE", event.getId());
        return true;
    }

    @Transactional
    public boolean paypal(String payload, org.springframework.http.HttpHeaders headers) {
        JsonNode root = read(payload);
        if (!paypalGateway.verifyWebhook(root, headers)) throw new IllegalArgumentException("PayPal webhook signature is invalid.");
        String eventId = root.path("id").asText(null);
        String eventType = root.path("event_type").asText(null);
        if (!StringUtils.hasText(eventId) || !StringUtils.hasText(eventType)) throw new IllegalArgumentException("PayPal webhook body is incomplete.");
        if (!recordOnce("PAYPAL", eventId, eventType, payload)) return true;
        JsonNode resource = root.path("resource");
        String orderId = resource.path("supplementary_data").path("related_ids").path("order_id").asText(null);
        switch (eventType) {
            case "PAYMENT.CAPTURE.COMPLETED" -> completePaypalCapture(orderId, resource);
            case "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED" -> refundPaypal(orderId, resource);
            case "PAYMENT.CAPTURE.DENIED" -> failPaypal(orderId, "DENIED");
            default -> { }
        }
        markProcessed("PAYPAL", eventId);
        return true;
    }

    private void completeStripeSession(JsonNode session) {
        String ref = session.path("metadata").path("transaction_ref").asText(null);
        String sessionId = session.path("id").asText(null);
        if (ref == null || sessionId == null) return;
        PaymentTransaction transaction = transactionRepository.findByTransactionRefForUpdate(ref).orElse(null);
        if (transaction == null || !"STRIPE".equals(transaction.getProvider()) || !sessionId.equals(transaction.getProviderOrderId())) return;
        boolean matches = "paid".equals(session.path("payment_status").asText())
                && transaction.getAmountMinor() == session.path("amount_total").asLong(-1)
                && transaction.getCurrency().equalsIgnoreCase(session.path("currency").asText());
        if (!matches) {
            provisioningService.fail(ref, session.path("payment_status").asText("UNKNOWN"), "CHECKOUT_NOT_PAID_OR_AMOUNT_MISMATCH");
            return;
        }
        provisioningService.complete(ref, session.path("payment_intent").asText(null), "PAID");
    }

    private void completePaypalCapture(String orderId, JsonNode capture) {
        if (orderId == null) return;
        PaymentTransaction transaction = transactionRepository.findByProviderOrderForUpdate("PAYPAL", orderId).orElse(null);
        if (transaction == null) return;
        JsonNode amount = capture.path("amount");
        boolean matches = "COMPLETED".equals(capture.path("status").asText())
                && transaction.getCurrency().equals(amount.path("currency_code").asText())
                && decimalAmount(transaction.getAmountMinor(), transaction.getCurrency()).equals(amount.path("value").asText());
        if (!matches) {
            provisioningService.fail(transaction.getTransactionRef(), capture.path("status").asText("UNKNOWN"), "CAPTURE_NOT_COMPLETED_OR_AMOUNT_MISMATCH");
            return;
        }
        provisioningService.complete(transaction.getTransactionRef(), capture.path("id").asText(null), "COMPLETED");
    }

    private void failPaypal(String orderId, String status) {
        if (orderId != null) transactionRepository.findByProviderOrderForUpdate("PAYPAL", orderId)
                .ifPresent(transaction -> provisioningService.fail(transaction.getTransactionRef(), status, "PAYPAL_CAPTURE_DENIED"));
    }

    private void refundPaypal(String orderId, JsonNode resource) {
        if (orderId == null) return;
        PaymentTransaction transaction = transactionRepository.findByProviderOrderForUpdate("PAYPAL", orderId).orElse(null);
        if (transaction == null) return;
        JsonNode amount = resource.path("amount");
        if (transaction.getCurrency().equals(amount.path("currency_code").asText())
                && decimalAmount(transaction.getAmountMinor(), transaction.getCurrency()).equals(amount.path("value").asText()))
            provisioningService.refund("PAYPAL", resource.path("id").asText(null), orderId);
    }

    private boolean recordOnce(String provider, String eventId, String eventType, String payload) {
        return eventRepository.insertIfAbsent(provider, eventId, eventType, sha256(payload)) == 1;
    }
    private void markProcessed(String provider, String eventId) {
        eventRepository.findByProviderAndEventId(provider, eventId).ifPresent(event -> {
            event.setStatus("PROCESSED"); event.setProcessedAt(java.time.Instant.now()); eventRepository.save(event);
        });
    }
    private JsonNode read(String payload) {
        try { return objectMapper.readTree(payload); }
        catch (Exception exception) { throw new IllegalArgumentException("Webhook payload is not valid JSON."); }
    }
    private String sha256(String payload) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("Could not hash payment event."); }
    }
    private String decimalAmount(long minor, String currency) {
        int scale = java.util.Set.of("JPY", "KRW", "VND").contains(currency.toUpperCase(Locale.ROOT)) ? 0 : 2;
        return java.math.BigDecimal.valueOf(minor, scale).toPlainString();
    }
}
