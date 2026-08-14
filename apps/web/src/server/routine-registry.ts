import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { isRoutineDue } from "./routine-due";

/**
 * P5 brick 2 — Routines: scheduled Core-side tasks. Each execution is a
 * REAL Hermes run whose result is delivered through the Presence Bus, under
 * the user's proactivity and quiet-hours preferences. File-backed in the
 * data dir, hence covered by the Identity Pack.
 */

export type RoutineSchedule =
  | { kind: "daily"; time: string /* "HH:MM" local */ }
  | { kind: "interval"; minutes: number };

export interface Routine {
  id: string;
  name: string;
  /** The prompt sent to the Core on each execution. */
  prompt: string;
  schedule: RoutineSchedule;
  modality: "voice" | "notification";
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  lastOutcome: string | null;
}

interface RoutinesFile {
  routines: Routine[];
}

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "routines.json");
}

function load(): RoutinesFile {
  const f = dataFile();
  if (!existsSync(f)) return { routines: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as RoutinesFile;
  } catch {
    return { routines: [] };
  }
}

function save(state: RoutinesFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function listRoutines(): Routine[] {
  return load().routines;
}

export function createRoutine(input: {
  name: string;
  prompt: string;
  schedule: RoutineSchedule;
  modality: "voice" | "notification";
  enabled?: boolean;
}): Routine {
  const state = load();
  const routine: Routine = {
    id: randomUUID(),
    name: input.name,
    prompt: input.prompt,
    schedule: input.schedule,
    modality: input.modality,
    enabled: input.enabled ?? true,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    lastOutcome: null,
  };
  state.routines.push(routine);
  save(state);
  return routine;
}

export function updateRoutine(
  id: string,
  patch: Partial<Pick<Routine, "enabled" | "name" | "prompt" | "modality">> & {
    lastRunAt?: string;
    lastOutcome?: string;
  }
): Routine | null {
  const state = load();
  const routine = state.routines.find((r) => r.id === id);
  if (!routine) return null;
  Object.assign(routine, patch);
  save(state);
  return routine;
}

export function deleteRoutine(id: string): boolean {
  const state = load();
  const before = state.routines.length;
  state.routines = state.routines.filter((r) => r.id !== id);
  save(state);
  return state.routines.length < before;
}

export function getRoutine(id: string): Routine | null {
  return load().routines.find((r) => r.id === id) ?? null;
}

/** Enabled routines whose schedule is due at `now`. */
export function dueRoutines(now = new Date()): Routine[] {
  return load().routines.filter((r) => r.enabled && isRoutineDue(r, now));
}
