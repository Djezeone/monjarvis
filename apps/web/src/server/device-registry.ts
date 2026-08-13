import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * P4 Omnipresence Fabric — Device Registry + Presence + command queue.
 *
 * The Core keeps the authoritative list of satellite devices, their declared
 * capabilities, and their live presence (derived from heartbeats — never
 * invented). Commands flow Core → satellite via polling over the private
 * mesh; satellites push results back. File-backed persistence is deliberate:
 * single-user local-first Core, no extra database organ required.
 */

export interface DeviceRecord {
  id: string;
  name: string;
  kind: "phone" | "desktop" | "laptop" | "home-node" | "wearable" | "other";
  capabilities: string[];
  registeredAt: string;
  lastSeenAt: string | null;
  /** Free-form presence facts reported by the device (foreground, battery…). */
  status: Record<string, string | number | boolean>;
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  capability: string;
  args: Record<string, unknown>;
  state: "pending" | "delivered" | "done" | "failed" | "refused";
  policy: { tier: "READ" | "ACT" | "CRITICAL"; reason: string; approvedBy?: string };
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface RegistryFile {
  devices: DeviceRecord[];
  commands: DeviceCommand[];
}

const ONLINE_WINDOW_MS = 90_000;

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "device-registry.json");
}

function load(): RegistryFile {
  const f = dataFile();
  if (!existsSync(f)) return { devices: [], commands: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as RegistryFile;
  } catch {
    return { devices: [], commands: [] };
  }
}

function save(state: RegistryFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function isOnline(device: DeviceRecord): boolean {
  return (
    device.lastSeenAt !== null &&
    Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_WINDOW_MS
  );
}

export function registerDevice(input: {
  id: string;
  name: string;
  kind: DeviceRecord["kind"];
  capabilities: string[];
}): DeviceRecord {
  const state = load();
  const now = new Date().toISOString();
  const existing = state.devices.find((d) => d.id === input.id);
  if (existing) {
    existing.name = input.name;
    existing.kind = input.kind;
    existing.capabilities = input.capabilities;
    existing.lastSeenAt = now;
    save(state);
    return existing;
  }
  const record: DeviceRecord = {
    ...input,
    registeredAt: now,
    lastSeenAt: now,
    status: {},
  };
  state.devices.push(record);
  save(state);
  return record;
}

export function heartbeat(
  deviceId: string,
  status: Record<string, string | number | boolean>
): DeviceRecord | null {
  const state = load();
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) return null;
  device.lastSeenAt = new Date().toISOString();
  device.status = status;
  save(state);
  return device;
}

export function listDevices(): Array<DeviceRecord & { online: boolean }> {
  return load().devices.map((d) => ({ ...d, online: isOnline(d) }));
}

export function enqueueCommand(input: {
  deviceId: string;
  capability: string;
  args: Record<string, unknown>;
  policy: DeviceCommand["policy"];
}): DeviceCommand | { error: string; status: number } {
  const state = load();
  const device = state.devices.find((d) => d.id === input.deviceId);
  if (!device) return { error: "unknown device", status: 404 };
  if (!device.capabilities.includes(input.capability)) {
    return { error: `device does not declare capability "${input.capability}"`, status: 400 };
  }
  const now = new Date().toISOString();
  const command: DeviceCommand = {
    id: randomUUID(),
    deviceId: input.deviceId,
    capability: input.capability,
    args: input.args,
    state: "pending",
    policy: input.policy,
    createdAt: now,
    updatedAt: now,
  };
  state.commands.push(command);
  save(state);
  return command;
}

/** Deliver pending commands to the polling device agent (marks them delivered). */
export function pullCommands(deviceId: string): DeviceCommand[] {
  const state = load();
  const pending = state.commands.filter(
    (c) => c.deviceId === deviceId && c.state === "pending"
  );
  const now = new Date().toISOString();
  for (const c of pending) {
    c.state = "delivered";
    c.updatedAt = now;
  }
  if (pending.length) save(state);
  return pending;
}

export function completeCommand(
  deviceId: string,
  commandId: string,
  outcome: { ok: boolean; result?: unknown; error?: string }
): DeviceCommand | null {
  const state = load();
  const command = state.commands.find(
    (c) => c.id === commandId && c.deviceId === deviceId
  );
  if (!command) return null;
  command.state = outcome.ok ? "done" : "failed";
  command.result = outcome.result;
  command.error = outcome.error;
  command.updatedAt = new Date().toISOString();
  save(state);
  return command;
}

export function listCommands(deviceId?: string): DeviceCommand[] {
  const all = load().commands;
  return deviceId ? all.filter((c) => c.deviceId === deviceId) : all;
}

/**
 * Shared-secret gate for device agents. One secret for the whole mesh in v1
 * (documented limitation — per-device tokens are the planned upgrade). When
 * the secret is not configured, the fabric is explicitly off: 503, never a
 * silent bypass.
 */
export function checkDeviceAuth(req: Request):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const secret = process.env.JARVIS_DEVICE_SHARED_SECRET || "";
  if (!secret) {
    return { ok: false, status: 503, error: "device fabric not configured (JARVIS_DEVICE_SHARED_SECRET unset)" };
  }
  const provided = req.headers.get("x-jarvis-device-secret") || "";
  if (provided !== secret) return { ok: false, status: 401, error: "invalid device secret" };
  return { ok: true };
}
