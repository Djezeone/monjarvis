import { test, expect } from "@playwright/test";

/**
 * P7 brick 1 — Impact: the numbers must move because JARVIS really acted.
 * The spec performs actual actions (a delivered command, a failed one) and
 * checks the report follows — successes AND failures — then verifies the
 * cockpit states what it deliberately does not measure.
 */
const DEVICE = {
  id: "impact-device",
  name: "Impact Device",
  kind: "desktop",
  capabilities: ["notify"],
};

test.describe.configure({ mode: "serial" });

test("les chiffres d'impact suivent des actions réellement effectuées", async ({
  request,
}) => {
  const before = await (await request.get("/api/jarvis/impact?days=30")).json();

  const { code } = await (await request.post("/api/jarvis/devices/enroll")).json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  const { token } = await claim.json();
  const auth = { headers: { "X-Jarvis-Device-Token": token } };

  // One command really executed, one really failed.
  const succeed = await (
    await request.post("/api/jarvis/devices/dispatch", {
      data: { deviceId: DEVICE.id, capability: "notify", args: { message: "impact ok" } },
    })
  ).json();
  const fail = await (
    await request.post("/api/jarvis/devices/dispatch", {
      data: { deviceId: DEVICE.id, capability: "notify", args: { message: "impact ko" } },
    })
  ).json();
  await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, auth);
  await request.post(`/api/jarvis/devices/${DEVICE.id}/commands/${succeed.id}`, {
    data: { ok: true, result: "affiché" },
    ...auth,
  });
  await request.post(`/api/jarvis/devices/${DEVICE.id}/commands/${fail.id}`, {
    data: { ok: false, error: "écran verrouillé" },
    ...auth,
  });

  const after = await (await request.get("/api/jarvis/impact?days=30")).json();
  expect(after.actions.executed).toBe(before.actions.executed + 1);
  expect(after.actions.failed).toBe(before.actions.failed + 1);
  expect(after.presence.devices).toBeGreaterThanOrEqual(before.presence.devices + 1);

  // A one-day window cannot contain more than the 30-day one.
  const short = await (await request.get("/api/jarvis/impact?days=1")).json();
  expect(short.windowDays).toBe(1);
  expect(short.actions.executed).toBeLessThanOrEqual(after.actions.executed);
});

test("le cockpit affiche l'impact et nomme ce qu'il ne mesure pas", async ({ page }) => {
  await page.goto("/app");
  const panel = page.getByTestId("impact-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId("impact-executed")).not.toBeEmpty();
  await expect(panel.getByTestId("impact-not-measured")).toContainText("heures gagnées");
});
