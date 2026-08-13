import { test, expect } from "@playwright/test";

/**
 * End-to-end proof of the P4 fabric contract with per-device tokens
 * (ADR-002): enroll → claim → authenticated heartbeat/poll → policy-gated
 * dispatch → result, plus revocation and cross-device isolation.
 */
const DEVICE = {
  id: "e2e-device",
  name: "E2E Test Device",
  kind: "desktop",
  capabilities: ["notify", "presence.ping", "camera.capture"],
};

let token = "";

test.describe.configure({ mode: "serial" });

test("sans token, les routes appareil sont rejetées (401)", async ({ request }) => {
  const r = await request.post(`/api/jarvis/devices/${DEVICE.id}/heartbeat`, {
    data: { status: {} },
  });
  expect(r.status()).toBe(401);
});

test("un code d'enrôlement invalide est rejeté (401)", async ({ request }) => {
  const r = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code: "not-a-real-code", ...DEVICE },
  });
  expect(r.status()).toBe(401);
});

test("enrôlement : code à usage unique → token par appareil", async ({ request }) => {
  const enroll = await request.post("/api/jarvis/devices/enroll");
  expect(enroll.ok()).toBeTruthy();
  const { code } = await enroll.json();

  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  expect(claim.ok()).toBeTruthy();
  const payload = await claim.json();
  token = payload.token;
  expect(token.length).toBeGreaterThan(20);
  expect(payload.device.tokenHash).toBeUndefined();

  // One-time: the same code must not work twice.
  const replay = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, ...DEVICE },
  });
  expect(replay.status()).toBe(401);
});

test("cycle complet : heartbeat → présence → dispatch → poll → result", async ({
  request,
}) => {
  const auth = { "X-Jarvis-Device-Token": token };

  const hb = await request.post(`/api/jarvis/devices/${DEVICE.id}/heartbeat`, {
    data: { status: { platform: "e2e", foreground: true } },
    headers: auth,
  });
  expect(hb.ok()).toBeTruthy();

  const list = await request.get("/api/jarvis/devices");
  const { devices } = await list.json();
  const me = devices.find((d: { id: string }) => d.id === DEVICE.id);
  expect(me?.online).toBe(true);

  const dispatch = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "presence.ping", args: {} },
  });
  expect(dispatch.ok()).toBeTruthy();
  const command = await dispatch.json();
  expect(command.policy.tier).toBe("READ");

  const poll = await request.get(`/api/jarvis/devices/${DEVICE.id}/commands`, {
    headers: auth,
  });
  const { commands } = await poll.json();
  expect(commands.map((c: { id: string }) => c.id)).toContain(command.id);

  const result = await request.post(
    `/api/jarvis/devices/${DEVICE.id}/commands/${command.id}`,
    { data: { ok: true, result: { pong: true } }, headers: auth }
  );
  expect(result.ok()).toBeTruthy();
  expect((await result.json()).state).toBe("done");
});

test("le token d'un appareil ne peut pas agir pour un autre (403)", async ({
  request,
}) => {
  const enroll = await request.post("/api/jarvis/devices/enroll");
  const { code } = await enroll.json();
  const claim = await request.post("/api/jarvis/devices/enroll/claim", {
    data: { code, id: "e2e-other", name: "Other", kind: "laptop", capabilities: [] },
  });
  const other = await claim.json();

  const r = await request.post(`/api/jarvis/devices/${DEVICE.id}/heartbeat`, {
    data: { status: {} },
    headers: { "X-Jarvis-Device-Token": other.token },
  });
  expect(r.status()).toBe(403);
});

test("une capability CRITICAL est refusée sans approbation explicite (428)", async ({
  request,
}) => {
  const r = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "camera.capture", args: {} },
  });
  expect(r.status()).toBe(428);
  expect((await r.json()).requiresApproval).toBe(true);
});

test("une capability non déclarée par l'appareil est refusée (400)", async ({
  request,
}) => {
  const r = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "app.launch", args: { app: "vscode" } },
  });
  expect(r.status()).toBe(400);
});

test("révocation : le token cesse de fonctionner immédiatement", async ({ request }) => {
  const revoke = await request.post(`/api/jarvis/devices/${DEVICE.id}/revoke`, {});
  expect(revoke.ok()).toBeTruthy();

  const hb = await request.post(`/api/jarvis/devices/${DEVICE.id}/heartbeat`, {
    data: { status: {} },
    headers: { "X-Jarvis-Device-Token": token },
  });
  expect(hb.status()).toBe(401);

  const dispatch = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "presence.ping", args: {} },
  });
  expect(dispatch.status()).toBe(410);
});
