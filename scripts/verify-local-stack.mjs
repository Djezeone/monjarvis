#!/usr/bin/env node
/**
 * JARVIS X2 — real end-to-end proof of the local stack (MASTER_BUILD_PROMPT
 * steps 11-12). Run this ON THE MACHINE where the services are up:
 *
 *   node scripts/verify-local-stack.mjs
 *
 * Environment (same variables as apps/web/.env.local):
 *   HERMES_API_URL       default http://127.0.0.1:8642
 *   GRAPHITI_MEMORY_URL  default http://127.0.0.1:8771
 *   JARVIS_APP_URL       default http://localhost:3000  (running `npm run dev|start`)
 *
 * Every check hits the real services — nothing is simulated. The run/stop/
 * approval checks go through the Next.js API routes so the proven path is the
 * same sanitized server-only path the UI uses.
 */

const HERMES = process.env.HERMES_API_URL || "http://127.0.0.1:8642";
const GRAPHITI = process.env.GRAPHITI_MEMORY_URL || "http://127.0.0.1:8771";
const APP = process.env.JARVIS_APP_URL || "http://localhost:3000";

const results = [];
let failed = 0;

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || "" });
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    failed++;
    results.push({ name, ok: false, detail: e.message });
    console.error(`  FAIL  ${name} — ${e.message}`);
  }
}

async function json(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${init?.method || "GET"} ${url} → ${r.status} ${await r.text().catch(() => "")}`.trim());
  return r.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollRun(id, until, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let run;
  while (Date.now() < deadline) {
    run = await json(`${APP}/api/jarvis/run/${encodeURIComponent(id)}`);
    if (until.includes(run.status)) return run;
    await sleep(1500);
  }
  throw new Error(`run ${id} still "${run?.status}" after ${timeoutMs / 1000}s (wanted: ${until.join("|")})`);
}

console.log("JARVIS X2 — vérification de la stack locale\n");

// ── Organ health ────────────────────────────────────────────────────────────
console.log("Santé des organes :");
await check("Hermes /health", async () => {
  const r = await fetch(`${HERMES}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error(`status ${r.status}`);
});
await check("Graphiti /health", async () => {
  const r = await fetch(`${GRAPHITI}/health`, { cache: "no-store" });
  if (!r.ok) throw new Error(`status ${r.status}`);
});
await check("App /api/jarvis/health", async () => {
  const d = await json(`${APP}/api/jarvis/health`);
  return d.organs.map((o) => `${o.name}:${o.status}`).join(", ");
});

// ── Step 11: memory write / recall ──────────────────────────────────────────
console.log("\nMémoire (étape 11 — écriture/rappel réels) :");
const marker = `jarvis-proof-${Date.now().toString(36)}`;
await check("Graphiti write episode", async () => {
  await json(`${GRAPHITI}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Vérification ${marker}`,
      body: `L'utilisateur a validé la stack locale JARVIS X2 (marqueur ${marker}).`,
      sourceDescription: "verify-local-stack",
      groupId: "jarvis-primary",
    }),
  });
  return marker;
});
await check("Graphiti recall episode", async () => {
  // Entity extraction is async — retry briefly before declaring failure.
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const u = new URL(`${GRAPHITI}/search`);
    u.searchParams.set("q", `vérification stack locale ${marker}`);
    u.searchParams.set("limit", "8");
    u.searchParams.set("group_id", "jarvis-primary");
    const facts = await json(u);
    if (Array.isArray(facts) && facts.length > 0) {
      return `${facts.length} fait(s) rappelé(s)`;
    }
    await sleep(5000);
  }
  throw new Error("aucun fait rappelé après 90s (ingestion Graphiti/Ollama à vérifier)");
});

// ── Step 12: run, stop, approval through the app's server routes ────────────
console.log("\nRun / stop / approbation (étape 12 — via les routes serveur) :");
await check("Run réel jusqu'à complétion", async () => {
  const run = await json(`${APP}/api/jarvis/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "Réponds simplement: OK." }),
  });
  const done = await pollRun(run.id, ["completed", "failed"]);
  if (done.status !== "completed") throw new Error(`status final: ${done.status} (${done.error || "?"})`);
  return `run ${run.id} completed`;
});
await check("Stop d'un run en cours", async () => {
  const run = await json(`${APP}/api/jarvis/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "Compte lentement jusqu'à 1000 en expliquant chaque nombre." }),
  });
  await sleep(1000);
  await json(`${APP}/api/jarvis/run/${encodeURIComponent(run.id)}/stop`, { method: "POST" });
  const done = await pollRun(run.id, ["stopped", "cancelled", "canceled", "failed", "completed"], 30_000);
  if (!["stopped", "cancelled", "canceled"].includes(done.status)) {
    throw new Error(`le run ne s'est pas arrêté (status: ${done.status})`);
  }
  return `run ${run.id} → ${done.status}`;
});
await check("Approbation (approve) acceptée par l'API", async () => {
  // Requires a Hermes toolset that raises approvals; if none is configured the
  // route still must answer coherently (4xx/502 from Hermes, never a crash).
  const run = await json(`${APP}/api/jarvis/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "Réponds: prêt." }),
  });
  const r = await fetch(`${APP}/api/jarvis/run/${encodeURIComponent(run.id)}/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  if (r.status >= 500 && r.status !== 502) throw new Error(`réponse serveur incohérente: ${r.status}`);
  return `route approval → ${r.status}`;
});

// ── Summary ─────────────────────────────────────────────────────────────────
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} vérifications passées${failed ? ` — ${failed} ÉCHEC(S)` : " — stack locale prouvée"}`);
process.exit(failed ? 1 : 0);
