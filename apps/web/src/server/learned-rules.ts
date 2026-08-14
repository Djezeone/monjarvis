/**
 * P5 brick 4 — pure learning rules over REAL observed events.
 *
 * The inference proposes, the human disposes: these functions only produce
 * candidates (a preference patch + human-checkable provenance). Nothing here
 * writes a preference — promotion is an explicit user action in the store.
 *
 * Pure and side-effect free so they can be unit-tested by feeding events.
 */

export interface RunEvent {
  /** Device name recorded on the run ("inconnu" when the surface gave none). */
  device: string;
  /** ISO timestamp of the run. */
  at: string;
}

export interface LearnedCandidate {
  kind: "preferred-device" | "quiet-hours";
  /** Preference patch — applied ONLY when the user explicitly promotes. */
  proposal: {
    preferredDevice?: string;
    quietHours?: { start: string; end: string };
  };
  /** One-line proposition, in the user's language. */
  message: string;
  /** Concrete evidence lines behind the proposal — counts, shares, window. */
  provenance: string[];
}

/** Runs that reflect actual user surfaces (routines and unknowns don't). */
function userRuns(events: RunEvent[]): RunEvent[] {
  return events.filter(
    (e) => e.device && e.device !== "inconnu" && !e.device.startsWith("routine:")
  );
}

/**
 * If a large share of recent runs come from one device — and it is not the
 * preferred device already — propose making it the default output device.
 */
export function preferredDeviceCandidate(
  events: RunEvent[],
  currentPreferredDevice: string,
  now: Date,
  opts: { windowDays: number; minRuns: number; minShare: number }
): LearnedCandidate | null {
  const since = now.getTime() - opts.windowDays * 24 * 60 * 60_000;
  const recent = userRuns(events).filter((e) => {
    const t = new Date(e.at).getTime();
    return Number.isFinite(t) && t >= since && t <= now.getTime();
  });
  if (recent.length === 0) return null;

  const counts = new Map<string, number>();
  for (const e of recent) counts.set(e.device, (counts.get(e.device) ?? 0) + 1);
  const [device, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = count / recent.length;

  if (count < opts.minRuns) return null;
  if (share < opts.minShare) return null;
  if (device === currentPreferredDevice) return null;

  const dates = recent
    .filter((e) => e.device === device)
    .map((e) => e.at)
    .sort();
  return {
    kind: "preferred-device",
    proposal: { preferredDevice: device },
    message: `Vous lancez vos runs surtout depuis « ${device} » — en faire l'appareil de sortie par défaut ?`,
    provenance: [
      `${count} runs sur ${recent.length} (${Math.round(share * 100)} %) depuis « ${device} » sur les ${opts.windowDays} derniers jours`,
      `premier: ${dates[0]}`,
      `dernier: ${dates[dates.length - 1]}`,
    ],
  };
}

/**
 * If, across enough distinct observed days, a long contiguous block of hours
 * never sees any activity — and no quiet hours are set — propose that block
 * as quiet hours. Handles the midnight wrap (circular scan).
 */
export function quietHoursCandidate(
  events: RunEvent[],
  currentQuietHours: { start: string; end: string } | null,
  opts: { minDays: number; minGapHours: number }
): LearnedCandidate | null {
  if (currentQuietHours) return null;

  const runs = userRuns(events).filter((e) => Number.isFinite(new Date(e.at).getTime()));
  const days = new Set(runs.map((e) => new Date(e.at).toISOString().slice(0, 10)));
  if (days.size < opts.minDays) return null;

  const histogram = new Array<number>(24).fill(0);
  for (const e of runs) histogram[new Date(e.at).getHours()]++;

  // Longest circular run of hours with zero activity — a block is measured
  // once, from its true start (the hour after an active one). days.size >=
  // minDays guarantees at least one active hour exists.
  let bestStart = -1;
  let bestLen = 0;
  for (let start = 0; start < 24; start++) {
    if (histogram[start] !== 0 || histogram[(start + 23) % 24] === 0) continue;
    let len = 0;
    while (len < 24 && histogram[(start + len) % 24] === 0) len++;
    if (len > bestLen) {
      bestLen = len;
      bestStart = start;
    }
  }
  if (bestLen < opts.minGapHours || bestStart < 0) return null;

  const hh = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
  const start = hh(bestStart);
  const end = hh(bestStart + bestLen);
  return {
    kind: "quiet-hours",
    proposal: { quietHours: { start, end } },
    message: `Aucune activité observée entre ${start} et ${end} — en faire vos heures calmes ?`,
    provenance: [
      `0 run entre ${start} et ${end} sur ${days.size} jours observés (${runs.length} runs)`,
    ],
  };
}
