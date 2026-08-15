/**
 * P8 brick 3 — browser worker connector, pure rules.
 *
 * This is the most dangerous capability JARVIS can hold: a browser carries
 * your logged-in sessions, and an agent clicking inside it can do anything
 * you can do. Three guards, all here:
 *
 *   1. OFF by default — having a URL and a token is not enough,
 *      JARVIS_BROWSER_ENABLED must be set explicitly.
 *   2. A domain allowlist — a task must declare where it goes, and every
 *      domain must have been declared beforehand.
 *   3. Always an approval — JARVIS cannot know in advance what a free-text
 *      task will click, so no browser task is ever "reversible". There is
 *      deliberately no read-only tier: claiming one would be a lie.
 *
 * Pure module: no filesystem, no network, directly unit-testable.
 */

export const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export function isValidDomain(input: string): boolean {
  return DOMAIN_RE.test(input);
}

/** A host matches an allowlisted domain exactly, or as one of its subdomains. */
export function domainAllowed(host: string, allowlist: string[]): boolean {
  const h = normalizeDomain(host);
  return allowlist.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Every domain a task declares must be allowed; returns the offenders. */
export function rejectedDomains(domains: string[], allowlist: string[]): string[] {
  return domains.map(normalizeDomain).filter((d) => !domainAllowed(d, allowlist));
}

/** Autonomy is bounded: a task never runs longer than the ceiling. */
export function clampSteps(requested: number | undefined, ceiling: number): number {
  if (!Number.isFinite(requested) || (requested as number) < 1) return Math.min(3, ceiling);
  return Math.min(requested as number, ceiling);
}

export interface BrowserConfigState {
  /** Explicitly switched on, beyond merely being configured. */
  enabled: boolean;
  /** URL and token present. */
  configured: boolean;
  missing: string[];
}

export function configState(env: {
  JARVIS_BROWSER_ENABLED?: string;
  JARVIS_BROWSER_WORKER_URL?: string;
  JARVIS_BROWSER_WORKER_TOKEN?: string;
}): BrowserConfigState {
  const enabled = (env.JARVIS_BROWSER_ENABLED || "").trim() === "1";
  const url = (env.JARVIS_BROWSER_WORKER_URL || "").trim();
  const token = (env.JARVIS_BROWSER_WORKER_TOKEN || "").trim();
  const missing: string[] = [];
  if (!enabled)
    missing.push("JARVIS_BROWSER_ENABLED=1 — le worker reste éteint tant qu'il n'est pas activé explicitement");
  if (!url) missing.push("JARVIS_BROWSER_WORKER_URL — aucune adresse de worker");
  if (!token) missing.push("JARVIS_BROWSER_WORKER_TOKEN — le worker refuserait la requête");
  return { enabled, configured: Boolean(url && token), missing };
}

/**
 * There is one tier and one only. Documented as a function so the intent
 * survives refactors: no caller can quietly downgrade it.
 */
export function browserTaskDecision(): {
  tier: "CRITICAL";
  requireApproval: true;
  reason: string;
} {
  return {
    tier: "CRITICAL",
    requireApproval: true,
    reason:
      "Un navigateur porte vos sessions connectées : JARVIS ne peut pas savoir d'avance ce qu'une tâche cliquera.",
  };
}
