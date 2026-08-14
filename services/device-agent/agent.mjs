#!/usr/bin/env node
/**
 * JARVIS X2 — Device Agent (P4 Omnipresence Fabric).
 *
 * Small daemon installed on every satellite (phone via Termux, laptop,
 * desktop, home node). It enrolls with the Core once, heartbeats its
 * presence, polls its command queue over the private mesh (Tailscale or
 * LAN), executes ONLY the capabilities allow-listed in its local config, and
 * reports real results back.
 *
 *   cp config.example.json config.json   # then edit
 *   node agent.mjs [path/to/config.json]
 *
 * Enrollment (per-device token — ADR-002):
 * 1. In the cockpit (/app → Présence), click "Enrôler un appareil" to get a
 *    one-time code (valid 10 min).
 * 2. Put it in config.json as "enrollmentCode" and start the agent: it
 *    exchanges the code for a per-device token, saved next to the config
 *    (device-token.json, chmod 600). Remove enrollmentCode afterwards.
 * 3. Revoking the device in the cockpit invalidates the token immediately.
 *
 * Security model:
 * - The Core is reached over the private mesh only — never expose it publicly.
 * - The agent refuses any capability absent from its own allowlist, whatever
 *   the Core says: the machine's owner has the last word.
 * - app.launch only spawns commands explicitly mapped in config; there is no
 *   arbitrary command execution in this agent.
 */

import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { spawn } from "node:child_process";
import { hostname, platform, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const configPath =
  process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "config.json");
let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch (e) {
  console.error(`Cannot read config at ${configPath}: ${e.message}`);
  console.error("Copy config.example.json to config.json and edit it first.");
  process.exit(1);
}

const CORE = (config.coreUrl || "http://127.0.0.1:3000").replace(/\/$/, "");
const DEVICE = {
  id: config.deviceId || hostname(),
  name: config.deviceName || hostname(),
  kind: config.kind || "desktop",
  capabilities: Object.keys(config.capabilities || {}),
};
const HEARTBEAT_S = Math.max(10, Number(config.heartbeatSeconds) || 30);
const POLL_S = Math.max(2, Number(config.pollSeconds) || 5);
const tokenPath = config.tokenFile || join(dirname(configPath), "device-token.json");

let TOKEN = "";
if (existsSync(tokenPath)) {
  try {
    TOKEN = JSON.parse(readFileSync(tokenPath, "utf8")).token || "";
  } catch {
    TOKEN = "";
  }
}

async function api(path, init = {}) {
  const r = await fetch(`${CORE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { "X-Jarvis-Device-Token": TOKEN } : {}),
      ...init.headers,
    },
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    const err = new Error(`${init.method || "GET"} ${path} → ${r.status} ${detail}`.trim());
    err.status = r.status;
    throw err;
  }
  return r.json();
}

async function enroll() {
  const code = String(config.enrollmentCode || "").trim();
  if (!code) {
    console.error("No device token and no enrollmentCode in config.");
    console.error("Cockpit → /app → Présence → « Enrôler un appareil », then put the code in config.json.");
    process.exit(1);
  }
  const { device, token } = await api("/api/jarvis/devices/enroll/claim", {
    method: "POST",
    body: JSON.stringify({ code, ...DEVICE }),
  });
  TOKEN = token;
  writeFileSync(tokenPath, JSON.stringify({ token, deviceId: device.id }, null, 2));
  try {
    chmodSync(tokenPath, 0o600);
  } catch {
    /* platform without POSIX modes */
  }
  console.log(`Enrolled as "${device.name}" (${device.id}). Token saved to ${tokenPath}.`);
  console.log("You can now remove enrollmentCode from config.json.");
}

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: false });
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("spawn", () => resolve({ ok: true }));
  });
}

function runToCompletion(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: false });
    child.on("error", (e) => resolve({ ok: false, error: e.message }));
    child.on("exit", (code) =>
      resolve(code === 0 ? { ok: true } : { ok: false, error: `${cmd} exited ${code}` })
    );
  });
}

/**
 * speak (home node, ACT): synthesize text locally and play it. Piper HTTP if
 * configured, else espeak-ng. Playback runs the owner-configured playCommand
 * ({file} placeholder), defaulting to aplay. No cloud TTS here — local-first.
 */
async function speak(text, options) {
  if (!text.trim()) return { ok: false, error: "empty text" };
  const wavPath = join(tmpdir(), `jarvis-speak-${Date.now()}.wav`);

  if (options?.piperUrl) {
    try {
      const r = await fetch(options.piperUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error(`piper ${r.status}`);
      writeFileSync(wavPath, Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      return { ok: false, error: `piper synthesis failed: ${e.message}` };
    }
  } else {
    const synth = await runToCompletion("espeak-ng", ["-v", options?.voice || "fr", "-w", wavPath, text]);
    if (!synth.ok) return { ok: false, error: `espeak-ng unavailable: ${synth.error}` };
  }

  const playCommand = Array.isArray(options?.playCommand) ? options.playCommand : ["aplay", "{file}"];
  const [cmd, ...args] = playCommand.map((part) => part.replaceAll("{file}", wavPath));
  const played = await runToCompletion(cmd, args);
  return played.ok ? { ok: true, result: { spoke: text.slice(0, 120) } } : played;
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

  if (capability === "speak") {
    return speak(String(args.text || ""), allowed && typeof allowed === "object" ? allowed : {});
  }

  return { ok: false, error: `capability "${capability}" has no executor in this agent version` };
}

function fatalOnRevocation(e) {
  if (e.status === 401) {
    console.error("Core rejected our token (revoked or invalid). Re-enroll with a fresh code.");
    process.exit(1);
  }
}

async function heartbeat() {
  try {
    await api(`/api/jarvis/devices/${encodeURIComponent(DEVICE.id)}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({
        status: {
          platform: platform(),
          // Presence facts for output routing (P4 brick 5). Only facts we
          // actually know: capabilities-derived ones plus owner-declared
          // facts from config.presenceFacts (e.g. {"foreground": true} on a
          // desktop where the owner wants answers to land by default).
          speaker: DEVICE.capabilities.includes("speak"),
          voiceBridge: Boolean(config.voiceBridge),
          ...(config.presenceFacts && typeof config.presenceFacts === "object"
            ? config.presenceFacts
            : {}),
        },
      }),
    });
  } catch (e) {
    fatalOnRevocation(e);
    console.error(`[heartbeat] ${e.message}`);
  }
}

/**
 * Home-node voice bridge: subscribe to the local runtime event bus; a
 * voice.final transcript becomes a Core run (this node's persistent session,
 * so the room keeps one continuous conversation) and the answer is spoken
 * locally when the speak capability is allow-listed.
 */
function startVoiceBridge() {
  const wsUrl = String(config.voiceBridge?.events || "ws://127.0.0.1:8765/events");
  const sessionPath = join(dirname(tokenPath), "node-session.json");
  let nodeSessionKey = "";
  try {
    nodeSessionKey = JSON.parse(readFileSync(sessionPath, "utf8")).sessionKey || "";
  } catch {
    /* first run */
  }

  const connect = () => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => console.log(`[bridge] connecté au bus voix ${wsUrl}`);
    ws.onclose = () => setTimeout(connect, 3000);
    ws.onerror = () => {
      /* onclose follows and schedules the retry */
    };
    ws.onmessage = async (m) => {
      let event;
      try {
        event = JSON.parse(String(m.data));
      } catch {
        return;
      }
      if (event.type !== "voice.final" || !String(event.text || "").trim()) return;
      const input = String(event.text).trim();
      console.log(`[bridge] transcript → Core: "${input}"`);
      try {
        const run = await api("/api/jarvis/run", {
          method: "POST",
          body: JSON.stringify({
            input,
            device: DEVICE.id,
            location: config.location || "home",
            sessionKey: nodeSessionKey || undefined,
          }),
        });
        if (run.sessionKey && run.sessionKey !== nodeSessionKey) {
          nodeSessionKey = run.sessionKey;
          writeFileSync(sessionPath, JSON.stringify({ sessionKey: nodeSessionKey }, null, 2));
        }
        const deadline = Date.now() + 120_000;
        let detail = run;
        while (Date.now() < deadline && !["completed", "failed", "cancelled", "stopped"].includes(detail.status)) {
          await new Promise((r) => setTimeout(r, 1200));
          detail = await api(`/api/jarvis/run/${encodeURIComponent(run.runId)}`);
        }
        if (!detail.output) {
          // The submission response never carries the output — fetch the
          // final run detail even when the run completed immediately.
          detail = await api(`/api/jarvis/run/${encodeURIComponent(run.runId)}`);
        }
        if (detail.status === "completed" && detail.output && config.capabilities?.speak !== undefined) {
          const spoken = await speak(detail.output, config.capabilities.speak === true ? {} : config.capabilities.speak);
          console.log(`[bridge] réponse ${spoken.ok ? "prononcée" : `non prononcée: ${spoken.error}`}`);
        } else if (detail.status !== "completed") {
          console.error(`[bridge] run ${run.runId} → ${detail.status}`);
        }
      } catch (e) {
        console.error(`[bridge] ${e.message}`);
      }
    };
  };
  connect();
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
    fatalOnRevocation(e);
    console.error(`[poll] ${e.message}`);
  }
}

if (!TOKEN) {
  await enroll();
} else {
  // Sync declared capabilities on start (authenticated re-registration).
  await api("/api/jarvis/devices", { method: "POST", body: JSON.stringify(DEVICE) }).catch(
    (e) => {
      fatalOnRevocation(e);
      console.error(`[register] ${e.message}`);
    }
  );
  console.log(`Using stored token for "${DEVICE.name}" (${DEVICE.id}) — Core ${CORE}`);
}
console.log(`Capabilities: ${DEVICE.capabilities.join(", ") || "(none)"}`);

setInterval(heartbeat, HEARTBEAT_S * 1000);
setInterval(poll, POLL_S * 1000);
if (config.voiceBridge) startVoiceBridge();
await heartbeat();
await poll();
