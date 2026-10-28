package health_assistant.module.billing.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.billing.dto.*;
import health_assistant.module.billing.service.BillingService;
import health_assistant.module.billing.service.PaymentWebhookService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/billing")
@RequiredArgsConstructor
public class BillingController {
    private final BillingService billingService;
    private final PaymentWebhookService webhookService;

    @GetMapping("/plans")
    public ResponseEntity<DefaultRes<List<BillingPlanResponse>>> plans() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, billingService.plans()));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<BillingStatusResponse>> status() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, billingService.status(SecurityUtils.getCurrentUserId())));
    }

    @PostMapping("/checkout")
    public ResponseEntity<DefaultRes<CheckoutResponse>> checkout(@Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED,
                billingService.createCheckout(SecurityUtils.getCurrentUserId(), request)));
    }

    @GetMapping("/transactions/{transactionRef}")
    public ResponseEntity<DefaultRes<PaymentTransactionResponse>> transaction(@PathVariable String transactionRef) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS,
                billingService.transaction(SecurityUtils.getCurrentUserId(), transactionRef)));
    }

    @PostMapping("/transactions/{transactionRef}/paypal/capture")
    public ResponseEntity<DefaultRes<PaymentTransactionResponse>> capturePaypal(@PathVariable String transactionRef) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS,
                billingService.capturePaypal(SecurityUtils.getCurrentUserId(), transactionRef)));
    }

    @PostMapping(value = "/webhooks/stripe", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> stripeWebhook(@RequestBody String payload,
            @RequestHeader("Stripe-Signature") String signature) {
        webhookService.stripe(payload, signature);
        return ResponseEntity.ok("ok");
    }

    @PostMapping(value = "/webhooks/paypal", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> paypalWebhook(@RequestBody String payload, @RequestHeader HttpHeaders headers) {
        webhookService.paypal(payload, headers);
        return ResponseEntity.ok("ok");
    }

    @GetMapping(value = "/return", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> paymentReturn() {
        return ResponseEntity.ok("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Payment status</title><body style=\"font:16px system-ui;max-width:560px;margin:15vh auto;padding:24px;color:#20213a\"><h1>Return to Health Assistant</h1><p>Payment status is verified by the app server. Return to the app and refresh your subscription status. This page does not activate Premium.</p></body></html>");
    }
}
