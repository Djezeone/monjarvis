import { test, expect } from "@playwright/test";

/**
 * P6 brick 1 — façade auth, exercised against the dedicated server on :3101
 * (JARVIS_AUTH_SECRET set). The main :3100 server stays open local-first —
 * the whole rest of the suite passing IS the proof that auth is opt-in.
 */
const AUTH_BASE = "http://127.0.0.1:3101";
const SECRET = "secret-de-test-e2e";

test.use({ baseURL: AUTH_BASE });

test.describe.configure({ mode: "serial" });

test("sans session, l'API et le cockpit sont fermés", async ({ request, page }) => {
  const api = await request.get("/api/jarvis/preferences");
  expect(api.status()).toBe(401);

  const status = await (await request.get("/api/jarvis/auth/status")).json();
  expect(status).toEqual({ enabled: true, authenticated: false });

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Secret JARVIS")).toBeVisible();
});

test("mauvais secret refusé ; bon secret ouvre puis logout referme", async ({ request }) => {
  const bad = await request.post("/api/jarvis/auth/login", { data: { secret: "faux" } });
  expect(bad.status()).toBe(401);

  const good = await request.post("/api/jarvis/auth/login", { data: { secret: SECRET } });
  expect(good.ok()).toBeTruthy();

  const open = await request.get("/api/jarvis/preferences");
  expect(open.status()).toBe(200);

  await request.post("/api/jarvis/auth/logout", {});
  const closed = await request.get("/api/jarvis/preferences");
  expect(closed.status()).toBe(401);
});

test("les satellites gardent leur voie : claim ouvert, autorité au token d'appareil", async ({
  request,
  playwright,
}) => {
  // Only an authenticated user can mint an enrollment code…
  await request.post("/api/jarvis/auth/login", { data: { secret: SECRET } });
  const { code } = await (await request.post("/api/jarvis/devices/enroll")).json();
  expect(code).toBeTruthy();

  // …but the satellite claims it WITHOUT any session: the code is the proof.
  const satellite = await playwright.request.newContext({ baseURL: AUTH_BASE });
  const claim = await satellite.post("/api/jarvis/devices/enroll/claim", {
    data: {
      code,
      id: "auth-sat",
      name: "Auth Sat",
      kind: "desktop",
      capabilities: ["notify"],
    },
  });
  expect(claim.ok()).toBeTruthy();
  const { token } = await claim.json();

  const withToken = { headers: { "X-Jarvis-Device-Token": token } };
  expect((await satellite.post("/api/jarvis/devices/auth-sat/heartbeat", withToken)).ok()).toBeTruthy();
  expect((await satellite.get("/api/jarvis/devices/auth-sat/commands", withToken)).ok()).toBeTruthy();

  // The middleware only steers — the route holds the authority.
  const bogus = await satellite.get("/api/jarvis/devices/auth-sat/commands", {
    headers: { "X-Jarvis-Device-Token": "totalement-faux" },
  });
  expect(bogus.status()).toBe(401);

  // The voice bridge path: a run with a valid device token, no cookie.
  const run = await satellite.post("/api/jarvis/run", {
    data: { input: "test run satellite sous auth" },
    ...withToken,
  });
  expect(run.ok()).toBeTruthy();
  expect((await run.json()).runId).toBeTruthy();

  const naked = await satellite.post("/api/jarvis/run", {
    data: { input: "sans aucune autorité" },
  });
  expect(naked.status()).toBe(401);

  // A device token NEVER opens user-side surfaces (dispatch stays closed).
  const dispatch = await satellite.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: "auth-sat", capability: "notify", args: { message: "x" } },
    ...withToken,
  });
  expect(dispatch.status()).toBe(401);

  await satellite.dispose();
});
