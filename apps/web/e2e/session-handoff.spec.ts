import { test, expect } from "@playwright/test";

/**
 * P4 session handoff, proven end-to-end against the Hermes test double:
 * a conversation started on one device is resumed from another with the
 * same sessionKey — the session provably carries the prior turns, and the
 * registry records the cross-device trail.
 */
test.describe.configure({ mode: "serial" });

let sessionKey = "";

test("un run sans sessionKey crée une session et la retourne", async ({ request }) => {
  const r = await request.post("/api/jarvis/run", {
    data: { input: "Prépare-moi l'architecture P5.", device: "desktop-bureau", location: "home" },
  });
  expect(r.ok()).toBeTruthy();
  const run = await r.json();
  sessionKey = run.sessionKey;
  expect(sessionKey.length).toBeGreaterThan(10);
  expect(run.status).toBe("completed");
});

test("le même sessionKey depuis un autre appareil continue la conversation", async ({
  request,
}) => {
  const r = await request.post("/api/jarvis/run", {
    data: {
      input: "Lis-moi ce que tu as trouvé.",
      sessionKey,
      device: "phone-s24",
      location: "mobile",
    },
  });
  expect(r.ok()).toBeTruthy();
  const run = await r.json();
  expect(run.sessionKey).toBe(sessionKey);

  // The Hermes side must see turn 2 of the SAME session, with turn 1 present.
  const status = await request.get(`/api/jarvis/run/${run.runId}`);
  const detail = await status.json();
  expect(detail.output).toContain("turn 2");
  expect(detail.output).toContain(`session "${sessionKey}"`);
  expect(detail.output).toContain("Prépare-moi l'architecture P5.");
});

test("le registre expose la trace inter-appareils de la session", async ({ request }) => {
  const r = await request.get("/api/jarvis/sessions");
  const { sessions } = await r.json();
  const s = sessions.find((x: { sessionKey: string }) => x.sessionKey === sessionKey);
  expect(s).toBeTruthy();
  expect(s.title).toBe("Prépare-moi l'architecture P5.");
  expect(s.lastDevice).toBe("phone-s24");
  const devices = s.activity.map((a: { device: string }) => a.device);
  expect(devices).toContain("desktop-bureau");
  expect(devices).toContain("phone-s24");
});

test("le cockpit liste la session et propose « Reprendre ici »", async ({ page }) => {
  await page.goto("/app");
  const row = page.locator("tr", { hasText: "Prépare-moi l'architecture P5." });
  await expect(row).toBeVisible();
  await expect(row.getByText("phone-s24")).toBeVisible();
  await row.getByRole("link", { name: "Reprendre ici" }).click();
  await page.waitForURL(/\/lab\/intelligence\?session=/);
  await expect(page.locator("[data-session-indicator]")).toContainText(
    sessionKey.slice(0, 8)
  );
});
