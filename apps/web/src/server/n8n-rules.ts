/**
 * P8 brick 1 — n8n connector, pure rules.
 *
 * The connector is built so that the day n8n actually runs, plugging it in
 * is three environment variables and a declared workflow — no code change.
 * Until then everything here reports its own absence honestly rather than
 * pretending a workflow engine exists.
 *
 * Pure module: no filesystem, no network, directly unit-testable.
 */

/** n8n webhook paths are path segments, not arbitrary URLs — never proxy. */
export const WORKFLOW_PATH_RE = /^[a-zA-Z0-9_-]{1,80}$/;

export function isValidWorkflowPath(path: string): boolean {
  return WORKFLOW_PATH_RE.test(path);
}

export function webhookUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path}`;
}

/** Health endpoint exposed by every n8n instance. */
export function healthUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/healthz`;
}

export interface N8nConfigState {
  /** Can JARVIS trigger workflows at all? */
  canTrigger: boolean;
  /** Can JARVIS verify the instance is alive? */
  canProbe: boolean;
  /** Is the shared secret set — i.e. can n8n tell the caller is JARVIS? */
  authenticated: boolean;
  /** What is missing, in plain words, for the cockpit to display. */
  missing: string[];
}

/**
 * What is configured and what is not. Reads a plain env-like object so the
 * rule stays pure and testable.
 */
export function configState(env: {
  N8N_WEBHOOK_BASE_URL?: string;
  N8N_BASE_URL?: string;
  N8N_JARVIS_SECRET?: string;
}): N8nConfigState {
  const webhook = (env.N8N_WEBHOOK_BASE_URL || "").trim();
  const base = (env.N8N_BASE_URL || "").trim();
  const secret = (env.N8N_JARVIS_SECRET || "").trim();
  const missing: string[] = [];
  if (!webhook) missing.push("N8N_WEBHOOK_BASE_URL — sans elle, aucun workflow ne peut être déclenché");
  if (!base) missing.push("N8N_BASE_URL — sans elle, la santé de l'instance ne peut pas être vérifiée");
  if (!secret) missing.push("N8N_JARVIS_SECRET — sans lui, n8n ne peut pas authentifier JARVIS");
  return {
    canTrigger: Boolean(webhook),
    canProbe: Boolean(base),
    authenticated: Boolean(secret),
    missing,
  };
}

/**
 * Risk tier of a workflow. Mirrors the device-dispatch contract: CRITICAL
 * needs an explicit human approval, ACT is a reversible action.
 */
export function workflowTier(requireApproval: boolean): "ACT" | "CRITICAL" {
  return requireApproval ? "CRITICAL" : "ACT";
}

/**
 * Idempotency key sent to n8n so a retried trigger cannot run twice: the
 * same workflow at the same instant is the same request.
 */
export function idempotencyKey(workflowId: string, at: string): string {
  return `jarvis-${workflowId}-${at}`;
}
