import { test, expect } from "@playwright/test";

/**
 * P5 brick 2 — routines are real Core runs delivered through the Presence
 * Bus, honestly gated by proactivity, with every outcome recorded.
 */
const DEVICE = {
  id: "routine-device",
  name: "Routine Device",
  kind: "desktop",
  capabilities: ["notify", "speak"],
};

let deviceToken = "";
let routineId = "";

test.describe.configure({ mode: "serial" });

test("création d'une routine (en pause pour ne pas dépendre du ticker)", async ({
  request,
}) => {
  const { code } = await (await request.post("/api/jarvis/devices/enroll")).json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  deviceToken = (await claim.json()).token;

  const r = await request.post("/api/jarvis/routines", {
    data: {
      name: "Brief de test",
      prompt: "Prépare le brief du matin.",
      schedule: { kind: "interval", minutes: 60 },
      modality: "notification",
      enabled: false,
    },
  });
  expect(r.ok()).toBeTruthy();
  routineId = (await r.json()).id;
});

test("proactivité off : l'exécution est refusée et l'issue enregistrée", async ({
  request,
}) => {
  await request.put("/api/jarvis/preferences", { data: { proactivity: "off" } });
  const r = await request.post(`/api/jarvis/routines/${routineId}/run`, {});
  expect(r.ok()).toBeTruthy();
  expect((await r.json()).outcome).toContain("proactivité désactivée");

  const { routines } = await (await request.get("/api/jarvis/routines")).json();
  const routine = routines.find((x: { id: string }) => x.id === routineId);
  expect(routine.lastOutcome).toContain("proactivité désactivée");
});

test("exécution réelle : run Core puis livraison routée sur un appareil", async ({
  request,
}) => {
  await request.put("/api/jarvis/preferences", {
    data: { proactivity: "normal", preferredDevice: DEVICE.id, quietHours: null },
  });

  const r = await request.post(`/api/jarvis/routines/${routineId}/run`, {});
  expect(r.ok()).toBeTruthy();
  const { outcome } = await r.json();
  expect(outcome).toContain("livrée à « Routine Device »");
  expect(outcome).toContain("notify");

  // The delivery really landed in the routed device's queue, and the
  // notification carries the Core run's output.
  const poll = await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, {
    headers: { "X-Jarvis-Device-Token": deviceToken },
  });
  const { commands } = await poll.json();
  const notify = commands.find((c: { capability: string }) => c.capability === "notify");
  expect(notify).toBeTruthy();
  expect(String(notify.args.message)).toContain("mock-hermes");

  // The routine's session is visible in the session registry (device routine:*).
  const { sessions } = await (await request.get("/api/jarvis/sessions")).json();
  const routineSession = sessions.find(
    (s: { lastDevice: string }) => s.lastDevice === "routine:Brief de test"
  );
  expect(routineSession).toBeTruthy();

  // Reset prefs for other specs.
  await request.put("/api/jarvis/preferences", {
    data: { proactivity: "low", preferredDevice: "" },
  });
});

test("suppression : la routine disparaît du registre", async ({ request }) => {
  const del = await request.delete(`/api/jarvis/routines/${routineId}`);
  expect(del.ok()).toBeTruthy();
  const { routines } = await (await request.get("/api/jarvis/routines")).json();
  expect(routines.find((x: { id: string }) => x.id === routineId)).toBeUndefined();
});
