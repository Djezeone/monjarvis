/**
 * P9 brick 1 — origin guard (CSRF).
 *
 * The hole this closes, found by re-reading the authority paths:
 *
 * In local-first mode — no JARVIS_AUTH_SECRET, which is the default and
 * the daily posture at home — nothing stopped ANY website you happened to
 * visit from doing:
 *
 *   fetch("http://127.0.0.1:3000/api/jarvis/devices/dispatch", {
 *     method: "POST", mode: "no-cors",
 *     headers: { "Content-Type": "text/plain" },   // ← a "simple request":
 *     body: JSON.stringify({ deviceId: "...",      //   no CORS preflight
 *       capability: "camera.capture", approvedBy: "operator" }),
 *   })
 *
 * The routes read the body with `req.json()`, which ignores Content-Type,
 * so the action ran. The attacker could not read the response — but the
 * side effect (camera, door lock, browser task) had already happened, with
 * a self-granted approval.
 *
 * With auth on, the SameSite=Lax cookie is withheld cross-site and the
 * middleware answers 401 — but local mode had no such shield. This guard
 * gives it one, in both modes: a state-changing request carrying a foreign
 * Origin is refused before it reaches any route.
 *
 * Non-browser callers (device agents, curl, the home node) send no Origin
 * at all and are unaffected — they carry their own device tokens.
 *
 * Pure module: the edge middleware imports it, so no node-only APIs.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isStateChanging(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

/**
 * Origins allowed to drive this instance besides its own. A Core sitting
 * behind the Vercel façade must name it here — explicitly declaring who
 * may command you is the point, not a chore.
 */
export function trustedOrigins(raw: string | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return "";
  }
}

/**
 * A request is allowed when it has no Origin (not a browser), when the
 * Origin is this very host, or when it was explicitly trusted. The literal
 * string "null" — sandboxed iframes, some redirects — is never trusted.
 */
export function originAllowed(input: {
  origin: string | null;
  host: string | null;
  trusted: string[];
}): boolean {
  const origin = (input.origin || "").trim();
  if (!origin) return true;
  if (origin === "null") return false;
  const originHost = hostOf(origin);
  if (!originHost) return false;
  if (input.host && originHost === input.host) return true;
  return input.trusted.some((t) => t === origin || hostOf(t) === originHost);
}
