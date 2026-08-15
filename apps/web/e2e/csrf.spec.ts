import { test, expect } from "@playwright/test";

/**
 * P9 brick 1 — the attack this guard closes, reproduced.
 *
 * Before: in local-first mode (no auth secret, the default at home), any
 * page the user visited could POST to the Core as a "simple request" — no
 * CORS preflight — and trigger a CRITICAL action with a self-granted
 * approval. The attacker could not read the answer, but the camera had
 * already fired. These tests send exactly that request.
 */
const EVIL = "https://evil.example";

test.describe.configure({ mode: "serial" });

test("un site tiers ne peut plus déclencher d'action CRITICAL auto-approuvée", async ({
  request,
}) => {
  const attack = await request.post("/api/jarvis/devices/dispatch", {
    headers: { Origin: EVIL, "Content-Type": "text/plain" },
    data: JSON.stringify({
      deviceId: "n-importe-lequel",
      capability: "camera.capture",
      approvedBy: "operator",
    }),
  });
  expect(attack.status()).toBe(403);
  expect((await attack.json()).error).toContain("origine");
});

test("la garde couvre tous les chemins d'autorité, pas seulement le dispatch", async ({
  request,
}) => {
  const targets = [
    { url: "/api/jarvis/home/call", data: { entityId: "lock.entree", service: "unlock", approvedBy: "operator" } },
    { url: "/api/jarvis/browser/run", data: { task: "x", domains: ["exemple.fr"], approvedBy: "operator" } },
    { url: "/api/jarvis/preferences", data: { proactivity: "off" } },
    { url: "/api/jarvis/devices/enroll", data: {} },
    { url: "/api/jarvis/run", data: { input: "coucou" } },
  ];
  for (const t of targets) {
    const r = await request.post(t.url, {
      headers: { Origin: EVIL, "Content-Type": "text/plain" },
      data: JSON.stringify(t.data),
    });
    expect(r.status(), `${t.url} doit refuser une origine étrangère`).toBe(403);
  }

  // PUT and DELETE are guarded too, not just POST.
  const put = await request.put("/api/jarvis/preferences", {
    headers: { Origin: EVIL, "Content-Type": "text/plain" },
    data: JSON.stringify({ tone: "compromis" }),
  });
  expect(put.status()).toBe(403);
});

test("les appels légitimes continuent de passer", async ({ request, page }) => {
  // Same-origin, as the cockpit does it.
  const sameOrigin = await request.post("/api/jarvis/devices/enroll", {
    headers: { Origin: "http://127.0.0.1:3100" },
  });
  expect(sameOrigin.ok()).toBeTruthy();

  // No Origin at all: device agents, the home node, curl.
  const agent = await request.post("/api/jarvis/devices/enroll");
  expect(agent.ok()).toBeTruthy();

  // Reads are never blocked, even from elsewhere.
  const read = await request.get("/api/jarvis/health", { headers: { Origin: EVIL } });
  expect(read.ok()).toBeTruthy();

  // And the real cockpit still works end to end.
  await page.goto("/app#monde");
  await expect(page.getByTestId("home-panel")).toBeVisible();
});

test("la façade déclarée dans les origines de confiance reste autorisée", async ({
  request,
}) => {
  // The Core trusts http://127.0.0.1:3102 (its façade) via
  // JARVIS_TRUSTED_ORIGINS — a foreign origin is refused, this one is not.
  const fromFacade = await request.post("/api/jarvis/devices/enroll", {
    headers: { Origin: "http://127.0.0.1:3102" },
  });
  expect(fromFacade.ok()).toBeTruthy();
});
