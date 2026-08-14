import { test, expect } from "@playwright/test";

/**
 * P5 brick 1 — the explicit preference model has REAL effects: preferences
 * are injected into run instructions, quiet hours downgrade voice deliveries
 * to notifications, and the preferred device is the routing default.
 */
async function enroll(
  request: import("@playwright/test").APIRequestContext,
  device: { id: string; name: string; kind: string; capabilities: string[] }
) {
  const { code } = await (await request.post("/api/jarvis/devices/enroll")).json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...device },
  });
  expect(claim.ok()).toBeTruthy();
}

function hhmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

test.describe.configure({ mode: "serial" });

test("les préférences s'enregistrent et se relisent", async ({ request }) => {
  const put = await request.put("/api/jarvis/preferences", {
    data: { language: "fr", tone: "concis et direct", quietHours: null, preferredDevice: "" },
  });
  expect(put.ok()).toBeTruthy();
  const prefs = await (await request.get("/api/jarvis/preferences")).json();
  expect(prefs.language).toBe("fr");
  expect(prefs.tone).toBe("concis et direct");
  expect(prefs.quietHours).toBeNull();
});

test("les préférences sont injectées dans les instructions de chaque run", async ({
  request,
}) => {
  const run = await request.post("/api/jarvis/run", {
    data: { input: "Test préférences.", device: "pref-test" },
  });
  expect(run.ok()).toBeTruthy();
  const { runId } = await run.json();
  const detail = await (await request.get(`/api/jarvis/run/${runId}`)).json();
  expect(detail.output).toContain("langue=fr");
  expect(detail.output).toContain("ton=concis et direct");
});

test("heures calmes : une livraison voix devient une notification", async ({
  request,
}) => {
  await enroll(request, {
    id: "pref-phone",
    name: "Pref Phone",
    kind: "phone",
    capabilities: ["notify", "speak"],
  });

  const now = new Date();
  const start = hhmm(new Date(now.getTime() - 60 * 60_000));
  const end = hhmm(new Date(now.getTime() + 60 * 60_000));
  await request.put("/api/jarvis/preferences", { data: { quietHours: { start, end } } });

  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Message nocturne", modality: "voice", preferredDevice: "pref-phone" },
  });
  expect(r.ok()).toBeTruthy();
  const { routing, command } = await r.json();
  expect(command.capability).toBe("notify");
  expect(routing.reason).toContain("heures calmes");
});

test("hors heures calmes, la voix reste la voix", async ({ request }) => {
  const now = new Date();
  const start = hhmm(new Date(now.getTime() + 2 * 60 * 60_000));
  const end = hhmm(new Date(now.getTime() + 3 * 60 * 60_000));
  await request.put("/api/jarvis/preferences", { data: { quietHours: { start, end } } });

  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Message diurne", modality: "voice", preferredDevice: "pref-phone" },
  });
  const { command } = await r.json();
  expect(command.capability).toBe("speak");
});

test("l'appareil préféré des préférences est le défaut du routage", async ({
  request,
}) => {
  await enroll(request, {
    id: "pref-desk",
    name: "Pref Desk",
    kind: "desktop",
    capabilities: ["notify"],
  });
  await request.put("/api/jarvis/preferences", {
    data: { preferredDevice: "pref-desk", quietHours: null },
  });

  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Rappel", modality: "notification" },
  });
  expect(r.ok()).toBeTruthy();
  const { routing } = await r.json();
  expect(routing.deviceId).toBe("pref-desk");
  expect(routing.reason).toContain("préférence explicite");

  // Reset for other spec files.
  await request.put("/api/jarvis/preferences", {
    data: { preferredDevice: "", quietHours: null, tone: "" },
  });
});
