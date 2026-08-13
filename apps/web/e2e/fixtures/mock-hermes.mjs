#!/usr/bin/env node
/**
 * Test double of the Hermes runs API, used ONLY by the e2e suite so the
 * run/session-handoff routes can be exercised for real in CI. It implements
 * the subset HermesRunsAdapter speaks: health, run submission (echoing the
 * session), and run status. Sessions accumulate their inputs so a resumed
 * session provably carries prior context.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_HERMES_PORT || 3199);
const runs = new Map();
const sessions = new Map();

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/health") return json(res, 200, { ok: true });

  if (!(req.headers.authorization || "").startsWith("Bearer ")) {
    return json(res, 401, { error: "missing bearer" });
  }

  if (req.method === "POST" && url.pathname === "/v1/runs") {
    const body = await readBody(req);
    const sessionKey = String(req.headers["x-hermes-session-key"] || "");
    const runId = `run-${runs.size + 1}-${Math.random().toString(36).slice(2, 8)}`;
    const history = sessions.get(sessionKey) || [];
    history.push(String(body.input || ""));
    if (sessionKey) sessions.set(sessionKey, history);
    runs.set(runId, {
      run_id: runId,
      session_id: sessionKey || undefined,
      status: "completed",
      // Echo the session depth so tests can prove continuity across devices.
      output: `mock-hermes: turn ${history.length} of session "${sessionKey}" — inputs: ${history.join(" | ")}`,
    });
    return json(res, 200, { run_id: runId, status: "completed" });
  }

  const match = url.pathname.match(/^\/v1\/runs\/([^/]+)$/);
  if (req.method === "GET" && match) {
    const run = runs.get(decodeURIComponent(match[1]));
    if (!run) return json(res, 404, { error: "unknown run" });
    return json(res, 200, run);
  }

  return json(res, 404, { error: "not implemented in mock" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock-hermes listening on 127.0.0.1:${PORT}`);
});
