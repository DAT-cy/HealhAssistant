# Billing Sandbox

The current Premium SKU is a prepaid 30-day pass, not an auto-renewing contract. The server seeds `PREMIUM_30D` at 499 USD cents (USD 4.99). Change `billing_plans.price_minor` and `currency` in the database to change the server-owned amount; mobile never submits price.

## Stripe

1. Create a Stripe test-mode account and use only an `sk_test_...` key.
2. Start the API on port 8084 and run `stripe listen --forward-to http://localhost:8084/api/v1/billing/webhooks/stripe`.
3. Put the CLI's `whsec_...` value in `STRIPE_WEBHOOK_SECRET` and the test secret in `STRIPE_SECRET_KEY`, then restart the API.
4. Set `BILLING_RETURN_URL` to an address the device/browser can reach. The route only displays a return message; poll `GET /api/v1/billing/me` for the webhook-confirmed state.
5. Use Stripe's official Checkout test payment details in the browser.

Expected events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and `charge.refunded`. The app only provisions when a verified Checkout event reports a paid session and the server-side amount/currency match.

## PayPal

1. Create a PayPal Sandbox REST app and set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`.
2. Expose the API through an HTTPS tunnel reachable by PayPal, register `/api/v1/billing/webhooks/paypal` in the Sandbox app, and place its webhook ID in `PAYPAL_WEBHOOK_ID`.
3. Set `BILLING_RETURN_URL` to the reachable API return page. A return URL never grants access.
4. In the app, open PayPal approval, return to the app, then press “capture” for the pending order. The API captures the server-stored order and checks its completed status, amount, and currency. Verified webhooks can also reconcile a capture.

## Expo Go and local setup

Set `BILLING_MODE=sandbox`. Do not put provider credentials in `EXPO_PUBLIC_*` or mobile source. Expo Go opens Checkout with `expo-web-browser`; it does not rely on a custom scheme callback. If the browser return target cannot resolve `localhost`, use a LAN URL or HTTPS tunnel for `BILLING_RETURN_URL` and ensure the mobile `EXPO_PUBLIC_API_BASE_URL` points to a reachable backend.

For an existing MySQL volume, apply `db/init/17_billing.sql` once; fresh Docker databases run it with the other init scripts. Hibernate `ddl-auto=update` creates runtime tables in the current dev profile, and the app seeds missing `FREE` and `PREMIUM_30D` plan rows at startup.

The return page and mobile status refresh do not grant access. A webhook signature/capture verification is required. No card number, CVV, or card token is stored by this application.

## Store release note

This browser-based Stripe/PayPal flow is for the Expo Go sandbox demo. Before a store release, review the distribution-region and storefront rules for digital subscriptions. See [Apple App Review Guidelines, section 3.1](https://developer.apple.com/app-store/review/guidelines/) and [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en); eligible regions and programs may have different conditions.
