#!/usr/bin/env node
/**
 * Home Assistant test double (P8 brick 2). Speaks the real contract:
 *   GET  /api/                       → {message:"API running."} (auth required)
 *   GET  /api/states/:entityId       → a state object
 *   POST /api/services/:domain/:svc  → [] (HA returns changed states)
 *   GET  /_received                  → what the double really received
 * Every route demands `Authorization: Bearer <token>`; an entity whose id
 * contains "boom" fails, to exercise honest failure reporting.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_HASS_PORT || 3197);
const TOKEN = process.env.MOCK_HASS_TOKEN || "e2e-hass-token";
const received = [];

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/_received") {
    return send(res, 200, { received });
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(res, 401, { message: "Unauthorized" });
  }
  if (req.method === "GET" && url.pathname === "/api/") {
    return send(res, 200, { message: "API running." });
  }
  if (req.method === "GET" && url.pathname.startsWith("/api/states/")) {
    const entityId = decodeURIComponent(url.pathname.slice("/api/states/".length));
    return send(res, 200, { entity_id: entityId, state: "off", attributes: {} });
  }
  if (req.method === "POST" && url.pathname.startsWith("/api/services/")) {
    const [domain, service] = url.pathname.slice("/api/services/".length).split("/");
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      received.push({ domain, service, body });
      if (body.includes("boom")) {
        return send(res, 500, { message: "service failed" });
      }
      send(res, 200, [{ entity_id: JSON.parse(body || "{}").entity_id, state: "on" }]);
    });
    return;
  }
  send(res, 404, { message: "not found" });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-hass] écoute sur http://127.0.0.1:${PORT}`);
});
