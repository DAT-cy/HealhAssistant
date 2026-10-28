package health_assistant.module.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.billing.config.BillingProperties;
import health_assistant.module.billing.repository.PaymentProviderEventRepository;
import health_assistant.module.billing.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class PaymentWebhookServiceTest {
    @Test
    void stripeRejectsInvalidSignatureBeforeAnyPersistence() {
        BillingProperties properties = new BillingProperties();
        properties.setStripeWebhookSecret("whsec_test");
        PaymentProviderEventRepository events = mock(PaymentProviderEventRepository.class);
        PaymentWebhookService service = new PaymentWebhookService(properties, mock(PaypalGateway.class), events,
                mock(PaymentTransactionRepository.class), mock(PaymentProvisioningService.class), new ObjectMapper());

        assertThrows(IllegalArgumentException.class, () -> service.stripe("{}", "t=1,v1=forged"));
        verifyNoInteractions(events);
    }

    @Test
    void paypalRejectsUnverifiedEventBeforeAnyPersistence() {
        PaypalGateway paypal = mock(PaypalGateway.class);
        when(paypal.verifyWebhook(any(), any(HttpHeaders.class))).thenReturn(false);
        PaymentProviderEventRepository events = mock(PaymentProviderEventRepository.class);
        PaymentWebhookService service = new PaymentWebhookService(new BillingProperties(), paypal, events,
                mock(PaymentTransactionRepository.class), mock(PaymentProvisioningService.class), new ObjectMapper());

        assertThrows(IllegalArgumentException.class, () -> service.paypal("{\"id\":\"evt_fake\",\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}", new HttpHeaders()));
        verifyNoInteractions(events);
    }
}
