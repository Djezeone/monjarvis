/**
 * P6 brick 2 — deployment roles. One codebase, two postures:
 *
 *   core   (default) — the brain: registries, ticker, Hermes access. The
 *            app exactly as it always ran; local-first unchanged.
 *   facade           — the public face (Vercel): UI + auth only. Every
 *            /api/jarvis/* call is proxied to JARVIS_CORE_URL; no state,
 *            no ticker, no Hermes credentials on this side.
 *
 * With the SAME JARVIS_AUTH_SECRET on both sides, the session cookie the
 * façade mints verifies on the Core too — single sign-on with zero extra
 * machinery. No "server-only" marker: the edge middleware imports this.
 */

export function deploymentRole(): "facade" | "core" {
  return process.env.JARVIS_ROLE === "facade" ? "facade" : "core";
}

/** Where the brain lives, façade-side. Empty when unset. */
export function coreUrl(): string {
  return (process.env.JARVIS_CORE_URL || "").trim().replace(/\/$/, "");
}
