package health_assistant.module.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.billing.config.BillingProperties;
import health_assistant.module.billing.entity.BillingPlan;
import health_assistant.module.billing.entity.PaymentTransaction;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class PaypalGateway {
    private final BillingProperties properties;
    private final ObjectMapper mapper;
    private final WebClient.Builder webClientBuilder;

    public JsonNode createOrder(PaymentTransaction transaction, BillingPlan plan) {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("intent", "CAPTURE");
        ArrayNode units = payload.putArray("purchase_units");
        ObjectNode unit = units.addObject();
        unit.put("reference_id", transaction.getTransactionRef());
        unit.put("custom_id", transaction.getTransactionRef());
        unit.put("description", plan.getName());
        ObjectNode amount = unit.putObject("amount");
        amount.put("currency_code", transaction.getCurrency());
        amount.put("value", decimalAmount(transaction.getAmountMinor(), transaction.getCurrency()));
        ObjectNode experience = payload.putObject("application_context");
        experience.put("return_url", returnUrl(transaction.getTransactionRef(), "paypal"));
        experience.put("cancel_url", returnUrl(transaction.getTransactionRef(), "paypal"));
        experience.put("user_action", "PAY_NOW");
        JsonNode response = api().post().uri("/v2/checkout/orders")
                .contentType(MediaType.APPLICATION_JSON).headers(headers -> headers.setBearerAuth(accessToken()))
                .bodyValue(payload).retrieve().bodyToMono(JsonNode.class).block(Duration.ofSeconds(25));
        if (response == null || !response.path("id").isTextual()) throw new IllegalStateException("PayPal did not return an order ID.");
        return response;
    }

    public JsonNode captureOrder(String orderId) {
        return api().post().uri("/v2/checkout/orders/{id}/capture", orderId)
                .contentType(MediaType.APPLICATION_JSON).headers(headers -> headers.setBearerAuth(accessToken()))
                .bodyValue(mapper.createObjectNode()).retrieve().bodyToMono(JsonNode.class).block(Duration.ofSeconds(25));
    }

    public boolean verifyWebhook(JsonNode event, org.springframework.http.HttpHeaders headers) {
        requireConfigured();
        if (!StringUtils.hasText(properties.getPaypalWebhookId())) throw new IllegalStateException("PayPal webhook ID is not configured.");
        ObjectNode verification = mapper.createObjectNode();
        verification.put("transmission_id", headers.getFirst("paypal-transmission-id"));
        verification.put("transmission_time", headers.getFirst("paypal-transmission-time"));
        verification.put("cert_url", headers.getFirst("paypal-cert-url"));
        verification.put("auth_algo", headers.getFirst("paypal-auth-algo"));
        verification.put("transmission_sig", headers.getFirst("paypal-transmission-sig"));
        verification.put("webhook_id", properties.getPaypalWebhookId());
        verification.set("webhook_event", event);
        JsonNode result = api().post().uri("/v1/notifications/verify-webhook-signature")
                .contentType(MediaType.APPLICATION_JSON).headers(h -> h.setBearerAuth(accessToken()))
                .bodyValue(verification).retrieve().bodyToMono(JsonNode.class).block(Duration.ofSeconds(25));
        return result != null && "SUCCESS".equals(result.path("verification_status").asText());
    }

    public boolean captureIsPaid(JsonNode response, PaymentTransaction transaction) {
        if (response == null || !"COMPLETED".equals(response.path("status").asText())) return false;
        for (JsonNode purchaseUnit : response.path("purchase_units")) {
            String customId = purchaseUnit.path("custom_id").asText("");
            for (JsonNode capture : purchaseUnit.path("payments").path("captures")) {
                JsonNode amount = capture.path("amount");
                if ("COMPLETED".equals(capture.path("status").asText())
                        && customId.equals(transaction.getTransactionRef())
                        && transaction.getCurrency().equals(amount.path("currency_code").asText())
                        && decimalAmount(transaction.getAmountMinor(), transaction.getCurrency()).equals(amount.path("value").asText())) return true;
            }
        }
        return false;
    }

    public String approvalUrl(JsonNode order) {
        for (JsonNode link : order.path("links"))
            if ("approve".equals(link.path("rel").asText()) || "payer-action".equals(link.path("rel").asText())) return link.path("href").asText(null);
        throw new IllegalStateException("PayPal did not return an approval URL.");
    }

    private String accessToken() {
        requireConfigured();
        JsonNode token = api().post().uri("/v1/oauth2/token")
                .headers(headers -> headers.setBasicAuth(properties.getPaypalClientId(), properties.getPaypalClientSecret()))
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("grant_type", "client_credentials"))
                .retrieve().bodyToMono(JsonNode.class).block(Duration.ofSeconds(20));
        String value = token == null ? null : token.path("access_token").asText(null);
        if (!StringUtils.hasText(value)) throw new IllegalStateException("Could not obtain a PayPal access token.");
        return value;
    }

    private WebClient api() { return webClientBuilder.baseUrl(properties.getPaypalApiBase()).build(); }
    private String returnUrl(String transactionRef, String provider) {
        return properties.getReturnUrl() + "?transactionRef=" + transactionRef + "&provider=" + provider;
    }
    private String decimalAmount(long minor, String currency) {
        int scale = SetOfZeroDecimalCurrencies.contains(currency.toUpperCase(Locale.ROOT)) ? 0 : 2;
        return BigDecimal.valueOf(minor, scale).setScale(scale, RoundingMode.UNNECESSARY).toPlainString();
    }
    private void requireConfigured() {
        if (!StringUtils.hasText(properties.getPaypalClientId()) || !StringUtils.hasText(properties.getPaypalClientSecret())
                ) throw new IllegalStateException("PayPal sandbox client credentials are not configured.");
        boolean sandbox = "sandbox".equalsIgnoreCase(properties.getMode());
        boolean localMock = properties.getPaypalApiBase().startsWith("http://localhost:") || properties.getPaypalApiBase().startsWith("http://127.0.0.1:");
        if ((sandbox && !properties.getPaypalApiBase().contains("sandbox.paypal.com") && !localMock)
                || (!sandbox && !properties.getPaypalApiBase().equals("https://api-m.paypal.com")))
            throw new IllegalStateException("PayPal API host không khớp BILLING_MODE.");
    }
    private static final java.util.Set<String> SetOfZeroDecimalCurrencies = java.util.Set.of("JPY", "KRW", "VND");
}
