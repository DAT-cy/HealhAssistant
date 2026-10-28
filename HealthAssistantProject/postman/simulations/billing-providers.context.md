# Billing Provider Simulation

First local run, 2026-10-27: `postman simulation run postman/simulations/billing-providers.sim.yaml --port 4900 --output ndjson --no-history` started successfully.

Probed `POST /v1/checkout/sessions` through route `stripe`; it returned a simulated Checkout Session. Probed PayPal OAuth, `POST /v2/checkout/orders`, and `/capture`; the mock returned an approval link and `COMPLETED` capture. The simulation log showed requests at both provider members. It proves the documented HTTP shapes route to stand-ins, not signature correctness, database provisioning, live/sandbox credentials, or actual provider behavior.

The mock implements the subset used by this app's create checkout/order/capture path. PayPal webhook signature verification is represented by a mock `SUCCESS` response and must only be tested with PayPal Sandbox before release. Stripe Checkout completion must be tested via Stripe CLI forwarding with a real `whsec_` test secret. No real provider requests were made.
