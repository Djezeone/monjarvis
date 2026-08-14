import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { listSessions } from "@/server/session-registry";
import { getPreferences, setPreferences } from "@/server/preference-store";
import {
  preferredDeviceCandidate,
  quietHoursCandidate,
  type LearnedCandidate,
} from "@/server/learned-rules";

/**
 * P5 brick 4 — learned preferences with provenance.
 *
 * The sweep observes real run history (session registry) and files candidate
 * preferences, each carrying the concrete evidence that produced it. The
 * sweep NEVER writes a preference: only an explicit user promotion applies
 * the patch to the preference store; a rejected proposal is never proposed
 * again. Candidates live in the data dir → covered by the Identity Pack.
 */

export interface LearnedPreference extends LearnedCandidate {
  id: string;
  createdAt: string;
  status: "proposed" | "promoted" | "rejected";
  decidedAt: string | null;
}

interface LearnedFile {
  candidates: LearnedPreference[];
}

const WINDOW_DAYS = Number(process.env.JARVIS_LEARN_WINDOW_DAYS || 7);
const MIN_RUNS = Number(process.env.JARVIS_LEARN_MIN_RUNS || 5);
const MIN_SHARE = Number(process.env.JARVIS_LEARN_MIN_SHARE || 0.6);
const QUIET_MIN_DAYS = Number(process.env.JARVIS_LEARN_QUIET_MIN_DAYS || 5);
const QUIET_MIN_GAP_H = Number(process.env.JARVIS_LEARN_QUIET_MIN_GAP_H || 6);

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "learned-preferences.json");
}

function load(): LearnedFile {
  const f = dataFile();
  if (!existsSync(f)) return { candidates: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as LearnedFile;
  } catch {
    return { candidates: [] };
  }
}

function save(state: LearnedFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function listLearned(): LearnedPreference[] {
  return load()
    .candidates.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

/**
 * Observe real history and file new candidates. Reads preferences, never
 * writes them. Dedup: a proposal identical to one already proposed — or one
 * the user rejected — is not filed again.
 */
export function sweepLearned(now = new Date()): { generated: number; proposed: number } {
  const prefs = getPreferences();
  const events = listSessions().flatMap((s) =>
    s.activity.map((a) => ({ device: a.device, at: a.at }))
  );

  const found: LearnedCandidate[] = [];
  const byDevice = preferredDeviceCandidate(events, prefs.preferredDevice, now, {
    windowDays: WINDOW_DAYS,
    minRuns: MIN_RUNS,
    minShare: MIN_SHARE,
  });
  if (byDevice) found.push(byDevice);
  const byQuiet = quietHoursCandidate(events, prefs.quietHours, {
    minDays: QUIET_MIN_DAYS,
    minGapHours: QUIET_MIN_GAP_H,
  });
  if (byQuiet) found.push(byQuiet);

  const state = load();
  let generated = 0;
  for (const candidate of found) {
    const proposalKey = JSON.stringify(candidate.proposal);
    const existing = state.candidates.find(
      (c) =>
        c.kind === candidate.kind &&
        JSON.stringify(c.proposal) === proposalKey &&
        (c.status === "proposed" || c.status === "rejected")
    );
    if (existing) continue;
    state.candidates.push({
      id: randomUUID(),
      ...candidate,
      createdAt: now.toISOString(),
      status: "proposed",
      decidedAt: null,
    });
    generated++;
  }
  save(state);
  return {
    generated,
    proposed: state.candidates.filter((c) => c.status === "proposed").length,
  };
}

/** Explicit user action: apply the candidate's patch to the preferences. */
export function promoteLearned(id: string): LearnedPreference | null {
  const state = load();
  const candidate = state.candidates.find((c) => c.id === id && c.status === "proposed");
  if (!candidate) return null;
  setPreferences(candidate.proposal);
  candidate.status = "promoted";
  candidate.decidedAt = new Date().toISOString();
  save(state);
  return candidate;
}

/** Explicit user action: this exact proposal will never be filed again. */
export function rejectLearned(id: string): LearnedPreference | null {
  const state = load();
  const candidate = state.candidates.find((c) => c.id === id && c.status === "proposed");
  if (!candidate) return null;
  candidate.status = "rejected";
  candidate.decidedAt = new Date().toISOString();
  save(state);
  return candidate;
}
