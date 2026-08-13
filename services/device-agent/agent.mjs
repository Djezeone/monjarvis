#!/usr/bin/env node
/**
 * JARVIS X2 — Device Agent (P4 Omnipresence Fabric).
 *
 * Small daemon installed on every satellite (phone via Termux, laptop,
 * desktop, home node). It registers with the Core, heartbeats its presence,
 * polls its command queue over the private mesh (Tailscale or LAN), executes
 * ONLY the capabilities allow-listed in its local config, and reports real
 * results back.
 *
 *   cp config.example.json config.json   # then edit
 *   node agent.mjs [path/to/config.json]
 *
 * Security model:
 * - The Core is reached over the private mesh only — never expose it publicly.
 * - The agent refuses any capability absent from its own allowlist, whatever
 *   the Core says: the machine's owner has the last word.
 * - app.launch only spawns commands explicitly mapped in config; there is no
 *   arbitrary command execution in this agent.
 */

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { hostname, platform } from "node:os";

const configPath = process.argv[2] || new URL("./config.json", import.meta.url).pathname;
let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (e) {
  console.error(`Cannot read config at ${configPath}: ${e.message}`);
  console.error("Copy config.example.json to config.json and edit it first.");
  process.exit(1);
}

const CORE = (config.coreUrl || "http://127.0.0.1:3000").replace(/\/$/, "");
const SECRET = config.deviceSecret || process.env.JARVIS_DEVICE_SHARED_SECRET || "";
const DEVICE = {
  id: config.deviceId || hostname(),
  name: config.deviceName || hostname(),
  kind: config.kind || "desktop",
  capabilities: Object.keys(config.capabilities || {}),
};
const HEARTBEAT_S = Math.max(10, Number(config.heartbeatSeconds) || 30);
const POLL_S = Math.max(2, Number(config.pollSeconds) || 5);

if (!SECRET) {
  console.error("deviceSecret missing (config or JARVIS_DEVICE_SHARED_SECRET). Refusing to start.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Jarvis-Device-Secret": SECRET,
};

async function api(path, init = {}) {
  const r = await fetch(`${CORE}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!r.ok) throw new Error(`${init.method || "GET"} ${path} → ${r.status} ${await r.text().catch(() => "")}`.trim());
  return r.json();
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: false });
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("spawn", () => resolve({ ok: true }));
  });
}

async function notify(title, message) {
  const p = platform();
  if (p === "linux") return run("notify-send", [title, message]);
  if (p === "darwin")
    return run("osascript", ["-e", `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`]);
  if (p === "win32")
    return run("powershell", [
      "-NoProfile",
      "-Command",
      `New-BurntToastNotification -Text ${JSON.stringify(title)}, ${JSON.stringify(message)}`,
    ]);
  return { ok: false, error: `notifications not supported on ${p}` };
}

async function execute(command) {
  const { capability, args } = command;
  const allowed = config.capabilities?.[capability];
  if (allowed === undefined) {
    return { ok: false, error: `capability "${capability}" is not allow-listed on this device` };
  }

  if (capability === "notify") {
    return notify(String(args.title || "JARVIS"), String(args.message || ""));
  }

  if (capability === "app.launch") {
    const app = String(args.app || "");
    const mapped = allowed && typeof allowed === "object" ? allowed[app] : undefined;
    if (!mapped) return { ok: false, error: `app "${app}" is not in this device's launch allowlist` };
    const [cmd, ...cmdArgs] = Array.isArray(mapped) ? mapped : String(mapped).split(" ");
    return run(cmd, cmdArgs);
  }

  if (capability === "presence.ping") {
    return { ok: true, result: { pong: true, at: new Date().toISOString() } };
  }

  return { ok: false, error: `capability "${capability}" has no executor in this agent version` };
}

async function heartbeat() {
  try {
    await api(`/api/jarvis/devices/${encodeURIComponent(DEVICE.id)}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ status: { platform: platform(), foreground: true } }),
    });
  } catch (e) {
    console.error(`[heartbeat] ${e.message}`);
  }
}

async function poll() {
  try {
    const { commands } = await api(`/api/jarvis/devices/${encodeURIComponent(DEVICE.id)}/commands`);
    for (const command of commands) {
      console.log(`[command] ${command.capability} (${command.policy.tier})`);
      const outcome = await execute(command);
      await api(
        `/api/jarvis/devices/${encodeURIComponent(DEVICE.id)}/commands/${encodeURIComponent(command.id)}`,
        { method: "POST", body: JSON.stringify(outcome) }
      );
      console.log(`[command] ${command.capability} → ${outcome.ok ? "done" : `failed: ${outcome.error}`}`);
    }
  } catch (e) {
    console.error(`[poll] ${e.message}`);
  }
}

const registered = await api("/api/jarvis/devices", {
  method: "POST",
  body: JSON.stringify(DEVICE),
});
console.log(`Registered "${registered.name}" (${registered.id}) with Core ${CORE}`);
console.log(`Capabilities: ${DEVICE.capabilities.join(", ") || "(none)"}`);

setInterval(heartbeat, HEARTBEAT_S * 1000);
setInterval(poll, POLL_S * 1000);
await heartbeat();
await poll();
