const http = require("http");
const PORT = process.env.PORT || 4501;
const JSON_HEADER = { "Content-Type": "application/json" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
    const body = await readForm(req);
    const sessionId = `cs_test_sim_${Date.now()}`;
    const currency = body.get("line_items[0][price_data][currency]") || "usd";
    const amount = Number(body.get("line_items[0][price_data][unit_amount]") || 0);
    const transactionRef = body.get("metadata[transaction_ref]") || "";
    const session = {
      id: sessionId,
      object: "checkout.session",
      url: `http://example.test/stripe-checkout/${sessionId}`,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      amount_total: amount,
      currency,
      metadata: {
        transaction_ref: transactionRef,
        user_id: body.get("metadata[user_id]") || "",
      },
    };
    await pm.state.set(`stripe-session:${sessionId}`, session);
    res.writeHead(200, JSON_HEADER);
    return res.end(JSON.stringify(session));
  }
  res.writeHead(404, JSON_HEADER);
  res.end(JSON.stringify({ error: { message: `No simulated Stripe endpoint for ${req.method} ${url.pathname}` } }));
});

function readForm(req) {
  return new Promise(resolve => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => resolve(new URLSearchParams(raw)));
  });
}

server.listen(PORT, () => process.stdout.write(`Stripe mock on ${PORT}\n`));
