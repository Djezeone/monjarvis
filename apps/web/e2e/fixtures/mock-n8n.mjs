#!/usr/bin/env node
/**
 * n8n test double (P8 brick 1). Speaks the real contract JARVIS relies on:
 *   GET  /healthz              → {status:"ok"}
 *   POST /webhook/:path        → echoes the payload, requires the shared
 *                                secret header, reports the idempotency key
 *   GET  /_received            → what the double actually received, so the
 *                                e2e can assert on the wire, not on our code
 * A workflow path containing "boom" fails, to exercise honest failures.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_N8N_PORT || 3198);
const SECRET = process.env.MOCK_N8N_SECRET || "e2e-n8n-secret";
const received = [];

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    return send(res, 200, { status: "ok" });
  }
  if (req.method === "GET" && url.pathname === "/_received") {
    return send(res, 200, { received });
  }
  if (req.method === "POST" && url.pathname.startsWith("/webhook/")) {
    const path = url.pathname.slice("/webhook/".length);
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (req.headers["x-jarvis-secret"] !== SECRET) {
        return send(res, 401, { error: "bad or missing X-Jarvis-Secret" });
      }
      received.push({
        path,
        body: raw,
        idempotencyKey: req.headers["idempotency-key"] || null,
      });
      if (path.includes("boom")) {
        return send(res, 500, { error: "workflow en échec côté n8n" });
      }
      send(res, 200, { workflow: path, echoed: JSON.parse(raw || "{}") });
    });
    return;
  }
  send(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-n8n] écoute sur http://127.0.0.1:${PORT}`);
});
