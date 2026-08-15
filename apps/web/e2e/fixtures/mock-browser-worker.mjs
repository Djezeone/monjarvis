#!/usr/bin/env node
/**
 * Browser worker test double (P8 brick 3). Speaks the adapter's contract:
 *   POST /tasks        → {id} (Bearer token required)
 *   GET  /tasks/:id    → {id, status}
 *   GET  /_received    → what the double really received
 * A task containing "boom" fails, to exercise honest failure reporting.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_BROWSER_PORT || 3196);
const TOKEN = process.env.MOCK_BROWSER_TOKEN || "e2e-browser-token";
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
    return send(res, 401, { error: "unauthorized" });
  }
  if (req.method === "POST" && url.pathname === "/tasks") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      received.push(JSON.parse(body || "{}"));
      if (body.includes("boom")) return send(res, 500, { error: "worker failed" });
      send(res, 200, { id: `task-${received.length}` });
    });
    return;
  }
  if (req.method === "GET" && url.pathname.startsWith("/tasks/")) {
    return send(res, 200, { id: url.pathname.slice("/tasks/".length), status: "running" });
  }
  send(res, 404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[mock-browser-worker] écoute sur http://127.0.0.1:${PORT}`);
});
