import { test, expect } from "@playwright/test";

/**
 * P5 brick 3 — proactive suggestions: a real failed command becomes a
 * suggestion, delivered under the proactivity cap, dismissible; off means
 * zero unsolicited messages.
 */
const DEVICE = {
  id: "suggest-device",
  name: "Suggest Device",
  kind: "desktop",
  capabilities: ["notify", "app.launch"],
};

let token = "";

test.describe.configure({ mode: "serial" });

async function failACommand(
  request: import("@playwright/test").APIRequestContext,
  errorText: string
) {
  const dispatch = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "app.launch", args: { app: "inconnu" } },
  });
  const command = await dispatch.json();
  await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, {
    headers: { "X-Jarvis-Device-Token": token },
  });
  await request.post(`/api/jarvis/devices/${DEVICE.id}/commands/${command.id}`, {
    data: { ok: false, error: errorText },
    headers: { "X-Jarvis-Device-Token": token },
  });
  return command.id as string;
}

test("proactivité off : le sweep ne fait rien du tout", async ({ request }) => {
  const { code } = await (await request.post("/api/jarvis/devices/enroll")).json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  token = (await claim.json()).token;

  await request.put("/api/jarvis/preferences", { data: { proactivity: "off" } });
  await failACommand(request, "échec de test hors proactivité");

  const sweep = await (await request.post("/api/jarvis/suggestions/sweep")).json();
  expect(sweep).toEqual({
    generated: 0,
    delivered: 0,
    journaled: 0,
    capped: 0,
    proactivity: "off",
  });
});

test("une commande échouée devient une suggestion livrée en notification", async ({
  request,
}) => {
  await request.put("/api/jarvis/preferences", {
    data: { proactivity: "normal", preferredDevice: DEVICE.id, quietHours: null },
  });

  const sweep = await (await request.post("/api/jarvis/suggestions/sweep")).json();
  expect(sweep.generated).toBeGreaterThanOrEqual(1);
  expect(sweep.delivered).toBeGreaterThanOrEqual(1);

  const { suggestions } = await (await request.get("/api/jarvis/suggestions")).json();
  const mine = suggestions.find(
    (s: { kind: string; message: string }) =>
      s.kind === "command-failed" && s.message.includes("échec de test hors proactivité")
  );
  expect(mine).toBeTruthy();
  expect(mine.deliveredTo).toBe(DEVICE.name);

  // The notification really landed in the device queue.
  const poll = await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, {
    headers: { "X-Jarvis-Device-Token": token },
  });
  const { commands } = await poll.json();
  const delivered = commands.find((c: { args: { message?: string } }) =>
    String(c.args.message || "").includes("Suggestion JARVIS")
  );
  expect(delivered).toBeTruthy();
});

test("au niveau low, une suggestion « utile » est journalisée, pas livrée", async ({
  request,
}) => {
  // P7 brick 3: low only lets IMPORTANT through. A failed command is
  // USEFUL — it is kept and visible, but it does not interrupt.
  await request.put("/api/jarvis/preferences", { data: { proactivity: "low" } });
  await failACommand(request, "premier échec sous le seuil");
  await failACommand(request, "second échec sous le seuil");

  const sweep = await (await request.post("/api/jarvis/suggestions/sweep")).json();
  expect(sweep.generated).toBe(2);
  expect(sweep.delivered).toBe(0);
  expect(sweep.journaled).toBeGreaterThanOrEqual(2);
  expect(sweep.capped).toBe(0);

  const { suggestions } = await (await request.get("/api/jarvis/suggestions")).json();
  const journaled = suggestions.find((s: { message: string }) =>
    s.message.includes("premier échec sous le seuil")
  );
  expect(journaled.level).toBe("useful");
  expect(journaled.decision).toContain("sous le seuil");
  expect(journaled.deliveredAt).toBeNull();

  // Ignore them so the cap test below starts from its own items only.
  for (const s of suggestions.filter((x: { dismissedAt: string | null }) => !x.dismissedAt)) {
    await request.post(`/api/jarvis/suggestions/${s.id}/dismiss`, {});
  }
});

test("le plafond horaire finit par reporter des livraisons", async ({ request }) => {
  await request.put("/api/jarvis/preferences", {
    data: { proactivity: "normal", preferredDevice: DEVICE.id },
  });
  for (let i = 0; i < 4; i++) await failACommand(request, `échec plafonné ${i}`);

  const sweep = await (await request.post("/api/jarvis/suggestions/sweep")).json();
  // Cap is 4/h and one delivery already happened this hour: some get
  // through, the surplus is explicitly reported as capped — never dropped.
  expect(sweep.delivered).toBeGreaterThan(0);
  expect(sweep.delivered).toBeLessThanOrEqual(4);
  expect(sweep.capped).toBeGreaterThan(0);
});

test("dismiss retire la suggestion des actives", async ({ request }) => {
  const { suggestions } = await (await request.get("/api/jarvis/suggestions")).json();
  const target = suggestions.find((s: { dismissedAt: string | null }) => !s.dismissedAt);
  expect(target).toBeTruthy();
  const r = await request.post(`/api/jarvis/suggestions/${target.id}/dismiss`, {});
  expect(r.ok()).toBeTruthy();
  expect((await r.json()).dismissedAt).toBeTruthy();

  // Reset prefs for other specs.
  await request.put("/api/jarvis/preferences", {
    data: { proactivity: "low", preferredDevice: "" },
  });
});
