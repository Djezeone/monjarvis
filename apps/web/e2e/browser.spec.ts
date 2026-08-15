import { test, expect } from "@playwright/test";

/**
 * P8 brick 3 — the browser worker: the most dangerous connector, so the
 * assertions focus on what must NEVER reach the worker.
 */
const MOCK = "http://127.0.0.1:3196";

test.describe.configure({ mode: "serial" });

test("une tâche sur un domaine non déclaré n'atteint jamais le worker", async ({
  request,
}) => {
  const state = await (await request.get("/api/jarvis/browser")).json();
  expect(state.config).toMatchObject({ enabled: true, configured: true });
  expect(state.stepCeiling).toBe(5);

  const refused = await request.post("/api/jarvis/browser/run", {
    data: {
      task: "lire la page d'accueil",
      domains: ["evil.example"],
      approvedBy: "operator",
    },
  });
  expect(refused.status()).toBe(403);

  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  expect(received.some((r: { task: string }) => r.task === "lire la page d'accueil")).toBe(
    false
  );
});

test("même sur un domaine déclaré, rien ne part sans approbation", async ({ request }) => {
  const bad = await request.post("/api/jarvis/browser/domains", {
    data: { domain: "localhost" },
  });
  expect(bad.status()).toBe(400);

  const created = await request.post("/api/jarvis/browser/domains", {
    data: { domain: "https://Exemple.FR/page" },
  });
  expect(created.ok()).toBeTruthy();
  // Normalized at declaration: scheme and path never enter the allowlist.
  expect((await created.json()).domain).toBe("exemple.fr");

  const refused = await request.post("/api/jarvis/browser/run", {
    data: { task: "consulter les tarifs", domains: ["blog.exemple.fr"] },
  });
  expect(refused.status()).toBe(428);
  expect((await refused.json()).requiresApproval).toBe(true);

  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  expect(received.some((r: { task: string }) => r.task === "consulter les tarifs")).toBe(
    false
  );
});

test("approuvée, la tâche part vraiment — bornée en pas et en domaines", async ({
  request,
}) => {
  const run = await request.post("/api/jarvis/browser/run", {
    data: {
      task: "consulter les tarifs",
      domains: ["blog.exemple.fr"],
      maxSteps: 99,
      approvedBy: "operator",
    },
  });
  expect(run.ok()).toBeTruthy();
  const outcome = await run.json();
  expect(outcome.steps).toBe(5); // clamped to the ceiling, not 99

  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  const hit = received.find((r: { task: string }) => r.task === "consulter les tarifs");
  expect(hit).toBeTruthy();
  expect(hit.maxSteps).toBe(5);
  expect(hit.allowedDomains).toEqual(["blog.exemple.fr"]);

  const impact = await (await request.get("/api/jarvis/impact?days=30")).json();
  expect(impact.browser.executed).toBeGreaterThanOrEqual(1);
  expect(impact.browser.domains).toBeGreaterThanOrEqual(1);
});

test("un échec du worker est rapporté comme un échec", async ({ request }) => {
  const run = await request.post("/api/jarvis/browser/run", {
    data: { task: "faire boom", domains: ["exemple.fr"], approvedBy: "operator" },
  });
  expect(run.status()).toBe(502);

  const state = await (await request.get("/api/jarvis/browser")).json();
  expect(state.executions[0].ok).toBe(false);
  expect(state.executions[0].detail).toContain("échec");
});

test("le cockpit annonce les trois garde-fous", async ({ page }) => {
  await page.goto("/app#action");
  const panel = page.getByTestId("browser-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Éteint par défaut");
  await expect(panel).toContainText("aucun niveau « lecture seule »");
  await expect(panel.getByTestId("browser-domains")).toContainText("exemple.fr");
});
