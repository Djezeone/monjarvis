import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P4 Session Handoff — the Core's registry of conversation sessions.
 *
 * Identity follows the user, not the device: a session is keyed by the
 * Hermes session key and records which devices touched it and when. A
 * conversation started on the desktop can be resumed from the phone by
 * reusing the same sessionKey — Hermes holds the conversational state, this
 * registry holds the cross-device continuity (last device, last input, run
 * history) so any surface can list and resume recent sessions.
 */

export interface SessionActivity {
  runId: string;
  device: string;
  location: string;
  input: string;
  at: string;
}

export interface SessionRecord {
  sessionKey: string;
  /** First input, kept as a human-readable session title. */
  title: string;
  createdAt: string;
  updatedAt: string;
  lastDevice: string;
  lastRunId: string;
  /** Most recent activity first, capped. */
  activity: SessionActivity[];
}

interface SessionsFile {
  sessions: SessionRecord[];
}

const ACTIVITY_CAP = 20;
const LIST_CAP = 25;

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "session-registry.json");
}

function load(): SessionsFile {
  const f = dataFile();
  if (!existsSync(f)) return { sessions: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as SessionsFile;
  } catch {
    return { sessions: [] };
  }
}

function save(state: SessionsFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

/** Record a run against a session — creates the session on first activity. */
export function recordSessionActivity(input: {
  sessionKey: string;
  runId: string;
  device?: string;
  location?: string;
  input: string;
}): SessionRecord {
  const state = load();
  const now = new Date().toISOString();
  const device = input.device?.trim() || "inconnu";
  const location = input.location?.trim() || "";

  let session = state.sessions.find((s) => s.sessionKey === input.sessionKey);
  if (!session) {
    session = {
      sessionKey: input.sessionKey,
      title: input.input.slice(0, 120),
      createdAt: now,
      updatedAt: now,
      lastDevice: device,
      lastRunId: input.runId,
      activity: [],
    };
    state.sessions.push(session);
  }
  session.updatedAt = now;
  session.lastDevice = device;
  session.lastRunId = input.runId;
  session.activity.unshift({
    runId: input.runId,
    device,
    location,
    input: input.input.slice(0, 300),
    at: now,
  });
  session.activity = session.activity.slice(0, ACTIVITY_CAP);
  save(state);
  return session;
}

/** Recent sessions, most recently active first. */
export function listSessions(): SessionRecord[] {
  return load()
    .sessions.slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, LIST_CAP);
}

export function getSession(sessionKey: string): SessionRecord | null {
  return load().sessions.find((s) => s.sessionKey === sessionKey) ?? null;
}
