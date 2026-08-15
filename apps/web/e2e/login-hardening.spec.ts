import { test, expect } from "@playwright/test";

/**
 * P9 brick 2 — the public door. Two servers prove the two halves:
 *   :3104 runs a DELIBERATELY weak secret and must refuse everyone —
 *         failing closed beats pretending to be protected;
 *   :3101 runs a strong one and must survive a brute-force burst.
 */
const WEAK = "http://127.0.0.1:3104";
const STRONG = "http://127.0.0.1:3101";
const STRONG_SECRET = "e2e-Ph4se-Jarvis-X2-Secret-2026";

test.describe.configure({ mode: "serial" });

test("secret faible : la façade se ferme au lieu de faire semblant", async ({
  request,
  page,
}) => {
  // Even the RIGHT secret does not open a door protected by a weak one.
  const withRightSecret = await request.post(`${WEAK}/api/jarvis/auth/login`, {
    data: { secret: "jarvis123" },
  });
  expect(withRightSecret.status()).toBe(503);
  expect((await withRightSecret.json()).error).toContain("24");

  const status = await (await request.get(`${WEAK}/api/jarvis/auth/status`)).json();
  expect(status.secretStrong).toBe(false);

  // And the login page states the real problem instead of "wrong secret".
  await page.goto(`${WEAK}/login`);
  await expect(page.getByTestId("secret-issue")).toContainText("24");

  // The cockpit stays closed: failing closed means closed.
  const api = await request.get(`${WEAK}/api/jarvis/preferences`);
  expect(api.status()).toBe(401);
});

test("secret solide : une rafale de tentatives finit bloquée", async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) {
    const r = await request.post(`${STRONG}/api/jarvis/auth/login`, {
      data: { secret: `tentative-${i}` },
    });
    statuses.push(r.status());
  }
  expect(statuses.filter((s) => s === 401).length).toBeGreaterThanOrEqual(10);
  expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);

  const last = await request.post(`${STRONG}/api/jarvis/auth/login`, {
    data: { secret: "encore-faux" },
  });
  expect(last.status()).toBe(429);
  expect(Number(last.headers()["retry-after"])).toBeGreaterThan(0);

  // Even the correct secret waits its turn — the lockout is not selective.
  const correct = await request.post(`${STRONG}/api/jarvis/auth/login`, {
    data: { secret: STRONG_SECRET },
  });
  expect(correct.status()).toBe(429);
});
