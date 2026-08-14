/**
 * P5 brick 5 — pure skill-learning rules over REAL run history.
 *
 * A skill candidate is a procedure the user demonstrably repeats: the same
 * request, several times, across several sessions. The rule only proposes —
 * approval (FR-009) happens in the store, on explicit user action, and only
 * approved skills become invocable.
 *
 * Pure and side-effect free so they can be unit-tested by feeding events.
 */

export interface RunInputEvent {
  /** The run's input text (as recorded on the session activity). */
  input: string;
  /** Device name recorded on the run. */
  device: string;
  /** Session the run belonged to. */
  sessionKey: string;
  /** ISO timestamp of the run. */
  at: string;
}

export interface SkillCandidate {
  /** Human-readable name derived from the repeated request. */
  name: string;
  /** The exact prompt to replay when the skill runs. */
  prompt: string;
  /** Grouping key: normalized form of the prompt. */
  normalized: string;
  message: string;
  /** Concrete evidence: occurrences, sessions, first/last dates. */
  provenance: string[];
}

/** Case/whitespace-insensitive grouping key for "the same request". */
export function normalizeInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

const MIN_INPUT_LENGTH = 12;

/**
 * Requests repeated at least `minRepeats` times across at least two distinct
 * sessions within the window become skill candidates. Runs produced by
 * routines or by skills themselves are excluded — only what the user
 * actually typed or said counts as a demonstrated procedure.
 */
export function repeatedProcedureCandidates(
  events: RunInputEvent[],
  now: Date,
  opts: { minRepeats: number; windowDays: number }
): SkillCandidate[] {
  const since = now.getTime() - opts.windowDays * 24 * 60 * 60_000;
  const relevant = events.filter((e) => {
    const t = new Date(e.at).getTime();
    return (
      Number.isFinite(t) &&
      t >= since &&
      t <= now.getTime() &&
      e.input.trim().length >= MIN_INPUT_LENGTH &&
      !e.device.startsWith("routine:") &&
      !e.device.startsWith("skill:")
    );
  });

  const groups = new Map<string, RunInputEvent[]>();
  for (const e of relevant) {
    const key = normalizeInput(e.input);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  const candidates: SkillCandidate[] = [];
  for (const [normalized, group] of groups) {
    const sessions = new Set(group.map((e) => e.sessionKey));
    if (group.length < opts.minRepeats || sessions.size < 2) continue;
    const dates = group.map((e) => e.at).sort();
    const prompt = group[group.length - 1].input;
    candidates.push({
      name: prompt.length > 60 ? `${prompt.slice(0, 57)}…` : prompt,
      prompt,
      normalized,
      message: `Vous répétez cette demande — en faire un skill réutilisable ?`,
      provenance: [
        `${group.length} occurrences dans ${sessions.size} sessions sur les ${opts.windowDays} derniers jours`,
        `première: ${dates[0]}`,
        `dernière: ${dates[dates.length - 1]}`,
      ],
    });
  }
  return candidates;
}
