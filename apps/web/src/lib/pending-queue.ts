/**
 * P6 brick 3 — the façade's pending-action queue.
 *
 * A façade is stateless by construction, so when the Core is offline the
 * only honest place to keep the user's instructions is the user's own
 * device: this queue lives in localStorage (injected here as a minimal
 * storage interface so the logic stays pure and unit-testable). Replay is
 * the component's job — each entry becomes a REAL Core run at recovery.
 */

export interface PendingRun {
  id: string;
  input: string;
  queuedAt: string;
}

export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PENDING_KEY = "jarvis-pending-runs";
const CAP = 20;

export function listPending(storage: QueueStorage): PendingRun[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PENDING_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PendingRun =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as PendingRun).id === "string" &&
        typeof (e as PendingRun).input === "string" &&
        typeof (e as PendingRun).queuedAt === "string"
    );
  } catch {
    return [];
  }
}

function save(storage: QueueStorage, entries: PendingRun[]): PendingRun[] {
  storage.setItem(PENDING_KEY, JSON.stringify(entries));
  return entries;
}

/** Queue an instruction; empty input is refused; newest CAP entries kept. */
export function queueRun(
  storage: QueueStorage,
  input: string,
  id: string,
  queuedAt: string
): PendingRun[] {
  const trimmed = input.trim();
  const entries = listPending(storage);
  if (!trimmed) return entries;
  return save(storage, [...entries, { id, input: trimmed, queuedAt }].slice(-CAP));
}

export function removePending(storage: QueueStorage, id: string): PendingRun[] {
  return save(
    storage,
    listPending(storage).filter((e) => e.id !== id)
  );
}
