package health_assistant.module.billing.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "billing")
public class BillingProperties {
    private String stripeSecretKey = "";
    private String stripeWebhookSecret = "";
    private String stripeApiBase = "https://api.stripe.com";
    private String paypalClientId = "";
    private String paypalClientSecret = "";
    private String paypalWebhookId = "";
    private String paypalApiBase = "https://api-m.sandbox.paypal.com";
    private String returnUrl = "http://localhost:8084/api/v1/billing/return";
    private String mode = "sandbox";

    public String getStripeSecretKey() { return stripeSecretKey; }
    public void setStripeSecretKey(String value) { stripeSecretKey = value; }
    public String getStripeWebhookSecret() { return stripeWebhookSecret; }
    public void setStripeWebhookSecret(String value) { stripeWebhookSecret = value; }
    public String getStripeApiBase() { return stripeApiBase; }
    public void setStripeApiBase(String value) { stripeApiBase = value; }
    public String getPaypalClientId() { return paypalClientId; }
    public void setPaypalClientId(String value) { paypalClientId = value; }
    public String getPaypalClientSecret() { return paypalClientSecret; }
    public void setPaypalClientSecret(String value) { paypalClientSecret = value; }
    public String getPaypalWebhookId() { return paypalWebhookId; }
    public void setPaypalWebhookId(String value) { paypalWebhookId = value; }
    public String getPaypalApiBase() { return paypalApiBase; }
    public void setPaypalApiBase(String value) { paypalApiBase = value; }
    public String getReturnUrl() { return returnUrl; }
    public void setReturnUrl(String value) { returnUrl = value; }
    public String getMode() { return mode; }
    public void setMode(String value) { mode = value; }
}
