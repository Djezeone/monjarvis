import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * P4 Omnipresence Fabric — Device Registry + Presence + command queue.
 *
 * Auth model (v1, replaces the v0 shared secret — see ADR-002):
 * - The operator creates a short-lived one-time enrollment code from the
 *   cockpit. A device agent claims it once and receives a per-device token.
 * - Only the SHA-256 hash of the token is stored; the plaintext is shown to
 *   the agent exactly once at claim time.
 * - Every device API call authenticates with X-Jarvis-Device-Token; the token
 *   identifies one device and cannot act for another.
 * - Revoking a device invalidates its token immediately.
 *
 * File-backed persistence is deliberate: single-user local-first Core, no
 * extra database organ required.
 */

export interface DeviceRecord {
  id: string;
  name: string;
  kind: "phone" | "desktop" | "laptop" | "home-node" | "wearable" | "other";
  capabilities: string[];
  registeredAt: string;
  lastSeenAt: string | null;
  /** SHA-256 hex of the per-device token. Never the plaintext. */
  tokenHash: string;
  revokedAt: string | null;
  /** Free-form presence facts reported by the device (foreground, battery…). */
  status: Record<string, string | number | boolean>;
}

export interface Enrollment {
  /** SHA-256 hex of the one-time code. */
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
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
  enrollments: Enrollment[];
}

const ONLINE_WINDOW_MS = 90_000;
const ENROLLMENT_TTL_MS = 10 * 60_000;

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "device-registry.json");
}

function load(): RegistryFile {
  const f = dataFile();
  if (!existsSync(f)) return { devices: [], commands: [], enrollments: [] };
  try {
    const parsed = JSON.parse(readFileSync(f, "utf8")) as Partial<RegistryFile>;
    return {
      devices: parsed.devices ?? [],
      commands: parsed.commands ?? [],
      enrollments: parsed.enrollments ?? [],
    };
  } catch {
    return { devices: [], commands: [], enrollments: [] };
  }
}

function save(state: RegistryFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isOnline(device: DeviceRecord): boolean {
  return (
    device.revokedAt === null &&
    device.lastSeenAt !== null &&
    Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_WINDOW_MS
  );
}

// ── Enrollment ──────────────────────────────────────────────────────────────

/** Operator-side: mint a one-time enrollment code (returned in plaintext once). */
export function createEnrollment(): { code: string; expiresAt: string } {
  const state = load();
  const code = randomBytes(16).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + ENROLLMENT_TTL_MS).toISOString();
  // Drop expired/used codes while we're here.
  state.enrollments = state.enrollments.filter(
    (e) => e.usedAt === null && new Date(e.expiresAt).getTime() > now
  );
  state.enrollments.push({
    codeHash: sha256(code),
    createdAt: new Date(now).toISOString(),
    expiresAt,
    usedAt: null,
  });
  save(state);
  return { code, expiresAt };
}

/**
 * Agent-side: exchange a valid enrollment code for a per-device token.
 * The plaintext token is returned exactly once.
 */
export function claimEnrollment(
  code: string,
  input: {
    id: string;
    name: string;
    kind: DeviceRecord["kind"];
    capabilities: string[];
  }
): { device: DeviceRecord; token: string } | { error: string; status: number } {
  const state = load();
  const now = Date.now();
  const codeHash = sha256(code);
  const enrollment = state.enrollments.find((e) => hashesEqual(e.codeHash, codeHash));
  if (!enrollment) return { error: "unknown enrollment code", status: 401 };
  if (enrollment.usedAt !== null) return { error: "enrollment code already used", status: 401 };
  if (new Date(enrollment.expiresAt).getTime() <= now) {
    return { error: "enrollment code expired", status: 401 };
  }

  enrollment.usedAt = new Date(now).toISOString();
  const token = randomBytes(32).toString("base64url");
  const nowIso = new Date(now).toISOString();

  const existing = state.devices.find((d) => d.id === input.id);
  const device: DeviceRecord = existing ?? {
    id: input.id,
    name: input.name,
    kind: input.kind,
    capabilities: input.capabilities,
    registeredAt: nowIso,
    lastSeenAt: nowIso,
    tokenHash: "",
    revokedAt: null,
    status: {},
  };
  device.name = input.name;
  device.kind = input.kind;
  device.capabilities = input.capabilities;
  device.tokenHash = sha256(token);
  device.revokedAt = null;
  device.lastSeenAt = nowIso;
  if (!existing) state.devices.push(device);
  save(state);
  return { device, token };
}

// ── Authentication ──────────────────────────────────────────────────────────

/**
 * Authenticate a device API call. The token identifies exactly one device;
 * when expectedDeviceId is given, a valid token for another device is
 * rejected (403) — a satellite can never act for a sibling.
 */
export function authenticateDevice(
  req: Request,
  expectedDeviceId?: string
): { ok: true; device: DeviceRecord } | { ok: false; status: number; error: string } {
  const token = req.headers.get("x-jarvis-device-token") || "";
  if (!token) return { ok: false, status: 401, error: "missing device token" };
  const tokenHash = sha256(token);
  const device = load().devices.find(
    (d) => d.tokenHash && hashesEqual(d.tokenHash, tokenHash)
  );
  if (!device) return { ok: false, status: 401, error: "invalid device token" };
  if (device.revokedAt !== null) {
    return { ok: false, status: 401, error: "device revoked" };
  }
  if (expectedDeviceId && device.id !== expectedDeviceId) {
    return { ok: false, status: 403, error: "token does not belong to this device" };
  }
  return { ok: true, device };
}

/** Operator-side: revoke a device — its token stops working immediately. */
export function revokeDevice(deviceId: string): DeviceRecord | null {
  const state = load();
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) return null;
  device.revokedAt = new Date().toISOString();
  device.tokenHash = "";
  save(state);
  return device;
}

// ── Registry operations ─────────────────────────────────────────────────────

/** Authenticated re-registration: update name/kind/capabilities. */
export function updateDevice(
  deviceId: string,
  input: { name?: string; kind?: DeviceRecord["kind"]; capabilities?: string[] }
): DeviceRecord | null {
  const state = load();
  const device = state.devices.find((d) => d.id === deviceId);
  if (!device) return null;
  if (input.name) device.name = input.name;
  if (input.kind) device.kind = input.kind;
  if (input.capabilities) device.capabilities = input.capabilities;
  device.lastSeenAt = new Date().toISOString();
  save(state);
  return device;
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

export function listDevices(): Array<
  Omit<DeviceRecord, "tokenHash"> & { online: boolean; revoked: boolean }
> {
  return load().devices.map(({ tokenHash: _tokenHash, ...d }) => ({
    ...d,
    online: isOnline({ ...d, tokenHash: _tokenHash }),
    revoked: d.revokedAt !== null,
  }));
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
  if (device.revokedAt !== null) return { error: "device revoked", status: 410 };
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
