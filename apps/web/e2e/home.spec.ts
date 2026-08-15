import { test, expect } from "@playwright/test";

/**
 * P8 brick 2 — the Home Assistant connector against the real HTTP contract
 * (double on :3197). The physical world is the place where "do not fake"
 * matters most: what is asserted is what Home Assistant really received.
 */
const MOCK = "http://127.0.0.1:3197";

test.describe.configure({ mode: "serial" });

test("l'instance est sondée pour de vrai", async ({ request }) => {
  const state = await (await request.get("/api/jarvis/home")).json();
  expect(state.health).toBe("connected");
  expect(state.config).toMatchObject({ canRead: true, canAct: true });
  expect(state.config.missing).toEqual([]);

  const { organs } = await (await request.get("/api/jarvis/health")).json();
  expect(organs.find((o: { name: string }) => o.name === "Home Assistant").status).toBe(
    "connected"
  );
});

test("hors allowlist, JARVIS ne lit ni n'agit", async ({ request }) => {
  const read = await request.get("/api/jarvis/home/state/light.jamais_declaree");
  expect(read.status()).toBe(403);

  const act = await request.post("/api/jarvis/home/call", {
    data: { entityId: "light.jamais_declaree", service: "turn_on" },
  });
  expect(act.status()).toBe(403);

  // The double must have seen nothing at all.
  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  expect(received.some((r: { body: string }) => r.body.includes("jamais_declaree"))).toBe(
    false
  );
});

test("une entité déclarée se lit et s'actionne réellement", async ({ request }) => {
  const bad = await request.post("/api/jarvis/home/entities", {
    data: { entityId: "salon" },
  });
  expect(bad.status()).toBe(400);

  const created = await request.post("/api/jarvis/home/entities", {
    data: { entityId: "light.salon" },
  });
  expect(created.ok()).toBeTruthy();

  const read = await (await request.get("/api/jarvis/home/state/light.salon")).json();
  expect(read.state.entity_id).toBe("light.salon");

  const call = await request.post("/api/jarvis/home/call", {
    data: { entityId: "light.salon", service: "turn_on" },
  });
  expect(call.ok()).toBeTruthy();
  expect((await call.json()).tier).toBe("ACT");

  const { received } = await (await request.get(`${MOCK}/_received`)).json();
  const hit = received.find(
    (r: { domain: string; service: string }) =>
      r.domain === "light" && r.service === "turn_on"
  );
  expect(hit).toBeTruthy();
  expect(JSON.parse(hit.body).entity_id).toBe("light.salon");
});

test("une serrure déclarée refuse d'agir sans approbation explicite", async ({
  request,
}) => {
  await request.post("/api/jarvis/home/entities", { data: { entityId: "lock.entree" } });

  const refused = await request.post("/api/jarvis/home/call", {
    data: { entityId: "lock.entree", service: "unlock" },
  });
  expect(refused.status()).toBe(428);
  expect((await refused.json()).requiresApproval).toBe(true);

  // Nothing reached Home Assistant while the approval was missing.
  const before = await (await request.get(`${MOCK}/_received`)).json();
  expect(before.received.some((r: { domain: string }) => r.domain === "lock")).toBe(false);

  const approved = await request.post("/api/jarvis/home/call", {
    data: { entityId: "lock.entree", service: "unlock", approvedBy: "operator" },
  });
  expect(approved.ok()).toBeTruthy();

  const after = await (await request.get(`${MOCK}/_received`)).json();
  expect(after.received.some((r: { domain: string }) => r.domain === "lock")).toBe(true);

  // Impact separates what needed a human from the rest.
  const impact = await (await request.get("/api/jarvis/impact?days=30")).json();
  expect(impact.home.approved).toBeGreaterThanOrEqual(1);
  expect(impact.home.executed).toBeGreaterThanOrEqual(2);
});

test("un échec côté Home Assistant est rapporté comme un échec", async ({ request }) => {
  await request.post("/api/jarvis/home/entities", { data: { entityId: "switch.boom" } });
  const call = await request.post("/api/jarvis/home/call", {
    data: { entityId: "switch.boom", service: "turn_on" },
  });
  expect(call.status()).toBe(502);

  const state = await (await request.get("/api/jarvis/home")).json();
  expect(
    state.entities.find((e: { entityId: string }) => e.entityId === "switch.boom")
      .lastOutcome
  ).toContain("échec");
});

test("le cockpit expose l'allowlist maison dans le monde Monde", async ({ page }) => {
  await page.goto("/app#monde");
  const panel = page.getByTestId("home-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("home-health")).toHaveText("connected");
  await expect(panel).toContainText("light.salon");
});
