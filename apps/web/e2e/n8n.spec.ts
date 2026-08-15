import { test, expect } from "@playwright/test";

/**
 * P8 brick 1 — the n8n connector against a real HTTP contract (the double
 * on :3198). What is asserted is what n8n actually received: the secret
 * header, the payload, the idempotency key — not our own code echoing back.
 */
const MOCK = "http://127.0.0.1:3198";

test.describe.configure({ mode: "serial" });

test("l'instance est sondée pour de vrai, pas déclarée en marche", async ({ request }) => {
  const state = await (await request.get("/api/jarvis/n8n")).json();
  expect(state.health).toBe("connected");
  expect(state.config).toMatchObject({
    canTrigger: true,
    canProbe: true,
    authenticated: true,
  });
  expect(state.config.missing).toEqual([]);

  // The organ page reports the same verified verdict, not "configured".
  const { organs } = await (await request.get("/api/jarvis/health")).json();
  expect(organs.find((o: { name: string }) => o.name === "n8n").status).toBe("connected");
});

test("seuls les workflows déclarés sont appelables, et jamais une URL", async ({
  request,
}) => {
  const rejected = await request.post("/api/jarvis/n8n/workflows", {
    data: { name: "Évasion", path: "http://evil.example/steal" },
  });
  expect(rejected.status()).toBe(400);

  const created = await request.post("/api/jarvis/n8n/workflows", {
    data: { name: "Brief du matin", path: "brief-matin" },
  });
  expect(created.ok()).toBeTruthy();
  const workflow = await created.json();
  expect(workflow.tier).toBe("ACT");

  // Same path twice is refused: the allowlist stays unambiguous.
  const dup = await request.post("/api/jarvis/n8n/workflows", {
    data: { name: "Doublon", path: "brief-matin" },
  });
  expect(dup.status()).toBe(409);

  const run = await request.post(`/api/jarvis/n8n/workflows/${workflow.id}/run`, {
    data: { input: { sujet: "journée" } },
  });
  expect(run.ok()).toBeTruthy();

  // Assert on the wire: n8n really received the call, authenticated.
  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  const hit = received.find((r: { path: string }) => r.path === "brief-matin");
  expect(hit).toBeTruthy();
  expect(JSON.parse(hit.body)).toEqual({ sujet: "journée" });
  expect(hit.idempotencyKey).toContain("jarvis-");

  const after = await (await request.get("/api/jarvis/n8n")).json();
  expect(
    after.workflows.find((w: { id: string }) => w.id === workflow.id).lastOutcome
  ).toBe("exécuté");
});

test("un workflow critique refuse de tourner sans approbation explicite", async ({
  request,
}) => {
  const created = await request.post("/api/jarvis/n8n/workflows", {
    data: { name: "Payment payout", path: "payment-payout" },
  });
  const workflow = await created.json();
  expect(workflow.tier).toBe("CRITICAL");

  const refused = await request.post(`/api/jarvis/n8n/workflows/${workflow.id}/run`, {
    data: { input: {} },
  });
  expect(refused.status()).toBe(428);
  expect((await refused.json()).requiresApproval).toBe(true);

  const approved = await request.post(`/api/jarvis/n8n/workflows/${workflow.id}/run`, {
    data: { input: {}, approvedBy: "operator" },
  });
  expect(approved.ok()).toBeTruthy();
});

test("un échec côté n8n est rapporté comme tel, jamais comme un succès", async ({
  request,
}) => {
  const created = await request.post("/api/jarvis/n8n/workflows", {
    data: { name: "Rapport boom", path: "rapport-boom" },
  });
  const workflow = await created.json();

  const run = await request.post(`/api/jarvis/n8n/workflows/${workflow.id}/run`, {
    data: { input: {} },
  });
  expect(run.status()).toBe(502);
  expect((await run.json()).error).toContain("500");

  const after = await (await request.get("/api/jarvis/n8n")).json();
  expect(
    after.workflows.find((w: { id: string }) => w.id === workflow.id).lastOutcome
  ).toContain("échec");

  // Impact counts the real executions, successes and failures apart.
  const impact = await (await request.get("/api/jarvis/impact?days=30")).json();
  expect(impact.automations.executed).toBeGreaterThanOrEqual(2);
  expect(impact.automations.failed).toBeGreaterThanOrEqual(1);
  expect(impact.automations.declared).toBeGreaterThanOrEqual(3);
});

test("le cockpit expose l'allowlist dans le monde Action", async ({ page }) => {
  await page.goto("/app#action");
  const panel = page.getByTestId("n8n-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("n8n-health")).toHaveText("connected");
  await expect(panel).toContainText("Brief du matin");
});
