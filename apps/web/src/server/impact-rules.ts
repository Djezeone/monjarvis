/**
 * P7 brick 1 — Impact Layer (CBOS "preuve de valeur"), pure rules.
 *
 * Honesty rule, non-negotiable: a metric exists here ONLY if a real record
 * backs it. JARVIS counts what it did — runs it started, commands devices
 * really executed, refusals, approvals it demanded, suggestions it
 * delivered, decisions the human made. It does NOT estimate "hours saved"
 * or "manual actions avoided": nothing in the system observes the
 * counterfactual, so those numbers would be invented. `notMeasured` names
 * them out loud instead of quietly omitting them.
 *
 * Pure and side-effect free: every function takes records and a window.
 */

export interface Windowed {
  /** ISO timestamp used to place the record in the window. */
  at: string;
}

/** Keep records whose timestamp falls inside the [now - days, now] window. */
export function inWindow<T extends Windowed>(records: T[], now: Date, days: number): T[] {
  const since = now.getTime() - days * 24 * 60 * 60_000;
  return records.filter((r) => {
    const t = new Date(r.at).getTime();
    return Number.isFinite(t) && t >= since && t <= now.getTime();
  });
}

export interface CommandFacts {
  state: "pending" | "delivered" | "done" | "failed" | "refused";
  tier: "READ" | "ACT" | "CRITICAL";
  approvedBy?: string;
  at: string;
}

export interface CommandImpact {
  /** Commands a satellite reported as really executed. */
  executed: number;
  /** Commands that came back as failures — counted, never hidden. */
  failed: number;
  /** Commands the policy engine or a device refused. */
  refused: number;
  /** CRITICAL actions that went through an explicit human approval. */
  criticalApproved: number;
  /** Still in flight at the end of the window. */
  inFlight: number;
}

export function commandImpact(
  commands: CommandFacts[],
  now: Date,
  days: number
): CommandImpact {
  const recent = inWindow(commands, now, days);
  return {
    executed: recent.filter((c) => c.state === "done").length,
    failed: recent.filter((c) => c.state === "failed").length,
    refused: recent.filter((c) => c.state === "refused").length,
    criticalApproved: recent.filter((c) => c.tier === "CRITICAL" && Boolean(c.approvedBy))
      .length,
    inFlight: recent.filter((c) => c.state === "pending" || c.state === "delivered").length,
  };
}

export interface SuggestionFacts {
  createdAt: string;
  deliveredAt: string | null;
  dismissedAt: string | null;
}

/** Proactivity is reported by what actually reached the user, and what they refused. */
export function suggestionImpact(
  suggestions: SuggestionFacts[],
  now: Date,
  days: number
): { raised: number; delivered: number; dismissed: number } {
  const recent = inWindow(
    suggestions.map((s) => ({ ...s, at: s.createdAt })),
    now,
    days
  );
  return {
    raised: recent.length,
    delivered: recent.filter((s) => s.deliveredAt).length,
    dismissed: recent.filter((s) => s.dismissedAt).length,
  };
}

export interface DecisionFacts {
  status: string;
  createdAt: string;
}

/**
 * Learning is only worth reporting through the human's decisions: what
 * JARVIS proposed, what was adopted, what was refused.
 */
export function decisionImpact(
  records: DecisionFacts[],
  now: Date,
  days: number,
  acceptedStatus: string,
  refusedStatus = "rejected"
): { proposed: number; accepted: number; refused: number } {
  const recent = inWindow(
    records.map((r) => ({ ...r, at: r.createdAt })),
    now,
    days
  );
  return {
    proposed: recent.length,
    accepted: recent.filter((r) => r.status === acceptedStatus).length,
    refused: recent.filter((r) => r.status === refusedStatus).length,
  };
}

/**
 * Metrics a CBOS Impact screen classically shows but that THIS system
 * cannot observe. Surfaced verbatim in the UI so the absence is a stated
 * choice, not an oversight.
 */
export const NOT_MEASURED: string[] = [
  "heures gagnées — aucun observateur du contrefactuel",
  "actions manuelles évitées — non observable sans suivi hors JARVIS",
  "valeur monétaire produite — hors périmètre du système",
];
