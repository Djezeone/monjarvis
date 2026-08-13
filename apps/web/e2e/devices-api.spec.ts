import { test, expect } from "@playwright/test";

/**
 * End-to-end proof of the P4 fabric contract against the real server:
 * register → heartbeat → presence → policy-gated dispatch → poll → result.
 * The webServer is started with JARVIS_DEVICE_SHARED_SECRET=e2e-fabric-secret.
 */
const SECRET = { "X-Jarvis-Device-Secret": "e2e-fabric-secret" };
const DEVICE = {
  id: "e2e-device",
  name: "E2E Test Device",
  kind: "desktop",
  capabilities: ["notify", "presence.ping"],
};

test.describe.configure({ mode: "serial" });

test("un agent sans secret est rejeté", async ({ request }) => {
  const r = await request.post("/api/jarvis/devices", { data: DEVICE });
  expect([401, 503]).toContain(r.status());
});

test("cycle complet du fabric : register → heartbeat → dispatch → poll → result", async ({
  request,
}) => {
  const reg = await request.post("/api/jarvis/devices", { data: DEVICE, headers: SECRET });
  expect(reg.ok()).toBeTruthy();

  const hb = await request.post(`/api/jarvis/devices/${DEVICE.id}/heartbeat`, {
    data: { status: { platform: "e2e", foreground: true } },
    headers: SECRET,
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
    headers: SECRET,
  });
  const { commands } = await poll.json();
  expect(commands.map((c: { id: string }) => c.id)).toContain(command.id);

  const result = await request.post(
    `/api/jarvis/devices/${DEVICE.id}/commands/${command.id}`,
    { data: { ok: true, result: { pong: true } }, headers: SECRET }
  );
  expect(result.ok()).toBeTruthy();
  expect((await result.json()).state).toBe("done");
});

test("une capability CRITICAL est refusée sans approbation explicite (428)", async ({
  request,
}) => {
  await request.post("/api/jarvis/devices", {
    data: { ...DEVICE, capabilities: [...DEVICE.capabilities, "camera.capture"] },
    headers: SECRET,
  });
  const r = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "camera.capture", args: {} },
  });
  expect(r.status()).toBe(428);
  expect((await r.json()).requiresApproval).toBe(true);
});

test("une capability non déclarée par l'appareil est refusée", async ({ request }) => {
  const r = await request.post("/api/jarvis/devices/dispatch", {
    data: { deviceId: DEVICE.id, capability: "app.launch", args: { app: "vscode" } },
  });
  expect(r.status()).toBe(400);
});
