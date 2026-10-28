const http = require("http");
const PORT = process.env.PORT || 4502;
const JSON_HEADER = { "Content-Type": "application/json" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/v1/oauth2/token") {
    return json(res, 200, { access_token: "sandbox-simulation-token", token_type: "Bearer", expires_in: 300 });
  }
  if (req.method === "POST" && url.pathname === "/v2/checkout/orders") {
    const body = await readJson(req);
    const orderId = `ORDER-SIM-${Date.now()}`;
    const order = { id: orderId, status: "CREATED", body };
    await pm.state.set(`paypal-order:${orderId}`, order);
    return json(res, 201, {
      id: orderId,
      status: "CREATED",
      links: [{ href: `http://example.test/paypal-approve/${orderId}`, rel: "approve", method: "GET" }],
    });
  }
  const captureMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
  if (req.method === "POST" && captureMatch) {
    const orderId = captureMatch[1];
    const order = await pm.state.get(`paypal-order:${orderId}`);
    if (!order) return json(res, 404, { name: "RESOURCE_NOT_FOUND", message: "Unknown simulated order" });
    const originalUnit = order.body.purchase_units[0];
    const amount = originalUnit.amount;
    const response = {
      id: orderId,
      status: "COMPLETED",
      purchase_units: [{
        custom_id: originalUnit.custom_id,
        reference_id: originalUnit.reference_id,
        payments: { captures: [{ id: `CAPTURE-SIM-${orderId}`, status: "COMPLETED", amount }] },
      }],
    };
    order.status = "COMPLETED";
    await pm.state.set(`paypal-order:${orderId}`, order);
    return json(res, 201, response);
  }
  if (req.method === "POST" && url.pathname === "/v1/notifications/verify-webhook-signature") {
    return json(res, 200, { verification_status: "SUCCESS" });
  }
  res.writeHead(404, JSON_HEADER);
  res.end(JSON.stringify({ name: "ENDPOINT_NOT_FOUND", message: `No simulated PayPal endpoint for ${req.method} ${url.pathname}` }));
});

function readJson(req) {
  return new Promise(resolve => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
  });
}
function json(res, status, body) { res.writeHead(status, JSON_HEADER); res.end(JSON.stringify(body)); }

server.listen(PORT, () => process.stdout.write(`PayPal mock on ${PORT}\n`));
