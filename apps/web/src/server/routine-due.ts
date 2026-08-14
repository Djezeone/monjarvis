/**
 * Pure due-time logic for routines — no filesystem, no server-only import,
 * so it is directly unit-testable (scripts/test-routines.mjs).
 */

export interface DueCheckable {
  schedule:
    | { kind: "daily"; time: string }
    | { kind: "interval"; minutes: number };
  lastRunAt: string | null;
}

export function isRoutineDue(routine: DueCheckable, now: Date): boolean {
  const last = routine.lastRunAt ? new Date(routine.lastRunAt) : null;

  if (routine.schedule.kind === "interval") {
    const minutes = Math.max(1, routine.schedule.minutes);
    if (!last) return true;
    return now.getTime() - last.getTime() >= minutes * 60_000;
  }

  // daily at HH:MM local: due once we've passed today's slot and the last
  // execution happened before it.
  const [h, m] = routine.schedule.time.split(":").map(Number);
  const slot = new Date(now);
  slot.setHours(h % 24, m % 60, 0, 0);
  if (now < slot) return false;
  return !last || last < slot;
}
