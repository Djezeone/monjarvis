import { test, expect } from "@playwright/test";

/**
 * P6 brick 2 — deployment roles. The :3102 server runs as FAÇADE (auth on,
 * own empty data dir, no ticker) and proxies /api/jarvis/* to the open Core
 * on :3100. The proof of the split: state written through the façade is
 * read back directly from the Core.
 */
const FACADE = "http://127.0.0.1:3102";
const CORE = "http://127.0.0.1:3100";
const SECRET = "e2e-Ph4se-Jarvis-X2-Secret-2026";

test.use({ baseURL: FACADE });

test.describe.configure({ mode: "serial" });

test("chaque instance annonce honnêtement son rôle", async ({ request }) => {
  await request.post("/api/jarvis/auth/login", { data: { secret: SECRET } });

  const facade = await (await request.get("/api/jarvis/facade/status")).json();
  expect(facade).toEqual({ role: "facade", coreConfigured: true, coreReachable: true });

  const core = await (await request.get(`${CORE}/api/jarvis/facade/status`)).json();
  expect(core.role).toBe("core");
});

test("la façade exige la session puis proxifie — l'état vit au Core", async ({ request }) => {
  const closed = await request.get("/api/jarvis/preferences");
  expect(closed.status()).toBe(401);

  await request.post("/api/jarvis/auth/login", { data: { secret: SECRET } });

  // Write through the façade…
  const marker = `via-facade-${Date.now()}`;
  const put = await request.put("/api/jarvis/preferences", { data: { tone: marker } });
  expect(put.ok()).toBeTruthy();

  // …and read it back DIRECTLY from the Core: the façade held no state.
  const direct = await (await request.get(`${CORE}/api/jarvis/preferences`)).json();
  expect(direct.tone).toBe(marker);

  await request.put("/api/jarvis/preferences", { data: { tone: "" } });
});

test("un run complet traverse la façade jusqu'au Core", async ({ request }) => {
  await request.post("/api/jarvis/auth/login", { data: { secret: SECRET } });

  const run = await request.post("/api/jarvis/run", {
    data: { input: "run de bout en bout via la façade", device: "facade-e2e" },
  });
  expect(run.ok()).toBeTruthy();
  const { runId, sessionKey } = await run.json();
  expect(runId).toBeTruthy();

  // The session was recorded by the CORE's registry, not the façade's.
  const { sessions } = await (await request.get(`${CORE}/api/jarvis/sessions`)).json();
  expect(
    sessions.some((s: { sessionKey: string }) => s.sessionKey === sessionKey)
  ).toBeTruthy();
});
