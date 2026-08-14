import { test, expect } from "@playwright/test";

/**
 * P4 Presence Bus — output routing proven against the real registry:
 * honest 503 with nothing capable, capability matching, foreground
 * preference, session continuity, and command queueing on the routed device.
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
  return (await claim.json()).token as string;
}

test.describe.configure({ mode: "serial" });

const PHONE = { id: "route-phone", name: "Routing Phone", kind: "phone", capabilities: ["notify"] };
const NODE = { id: "route-node", name: "Routing Node", kind: "home-node", capabilities: ["speak"] };
const DESK = { id: "route-desk", name: "Routing Desk", kind: "desktop", capabilities: ["speak", "notify"] };

let phoneToken = "";
let nodeToken = "";
let deskToken = "";

test("sans appareil capable, la livraison voix est refusée honnêtement (503)", async ({
  request,
}) => {
  phoneToken = await enroll(request, PHONE); // notify only — no speak yet
  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Bonjour", modality: "voice" },
  });
  expect(r.status()).toBe(503);
  expect((await r.json()).error).toContain("speak");
});

test("le routage voix choisit l'enceinte du foyer quand elle existe", async ({
  request,
}) => {
  nodeToken = await enroll(request, NODE);
  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Réponse au salon", modality: "voice" },
  });
  expect(r.ok()).toBeTruthy();
  const { routing, command } = await r.json();
  expect(routing.deviceId).toBe(NODE.id);
  expect(routing.reason).toContain("enceinte du foyer");
  expect(command.capability).toBe("speak");

  // The command really lands in the routed device's queue.
  const poll = await request.get(`/api/jarvis/devices/${NODE.id}/commands`, {
    headers: { "X-Jarvis-Device-Token": nodeToken },
  });
  const { commands } = await poll.json();
  expect(commands.map((c: { id: string }) => c.id)).toContain(command.id);
});

test("un appareil au premier plan gagne sur l'enceinte", async ({ request }) => {
  deskToken = await enroll(request, DESK);
  const hb = await request.post(`/api/jarvis/devices/${DESK.id}/heartbeat`, {
    data: { status: { foreground: true, speaker: true } },
    headers: { "X-Jarvis-Device-Token": deskToken },
  });
  expect(hb.ok()).toBeTruthy();

  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Réponse au bureau", modality: "voice" },
  });
  const { routing } = await r.json();
  expect(routing.deviceId).toBe(DESK.id);
  expect(routing.reason).toContain("premier plan");
});

test("la continuité de session l'emporte sur tout le reste", async ({ request }) => {
  // A run from the node binds the session to it (mock Hermes completes it).
  const run = await request.post("/api/jarvis/run", {
    data: { input: "Où en étions-nous ?", device: NODE.id, location: "salon" },
  });
  const { sessionKey } = await run.json();

  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Suite de la conversation", modality: "voice", sessionKey },
  });
  const { routing } = await r.json();
  expect(routing.deviceId).toBe(NODE.id);
  expect(routing.reason).toContain("continuité de session");
});

test("les notifications routent vers un appareil qui déclare notify", async ({
  request,
}) => {
  const r = await request.post("/api/jarvis/deliver", {
    data: { message: "Rappel", modality: "notification", preferredDevice: PHONE.id },
  });
  expect(r.ok()).toBeTruthy();
  const { routing, command } = await r.json();
  expect(routing.deviceId).toBe(PHONE.id);
  expect(routing.reason).toContain("préférence explicite");
  expect(command.capability).toBe("notify");
  void phoneToken;
});
