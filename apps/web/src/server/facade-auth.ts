/**
 * P6 brick 1 — façade auth: single-user session tokens, signed with
 * HMAC-SHA256 over Web Crypto so the SAME code verifies in the edge
 * middleware and in node routes. No import of node:crypto and no
 * "server-only" marker on purpose — the middleware runs on the edge
 * runtime.
 *
 * Opt-in by construction: when JARVIS_AUTH_SECRET is unset the façade
 * stays local-first and open, exactly as before this brick.
 */

export const SESSION_COOKIE = "jarvis_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export function authSecret(): string {
  return process.env.JARVIS_AUTH_SECRET?.trim() || "";
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string equality (compares SHA-256 digests, so length leaks nothing). */
export async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const digest = async (s: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [da, db] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

/** `${expiresMs}.${hmac(secret, "jarvis-session:" + expiresMs)}` */
export async function createSessionToken(
  secret: string,
  now = Date.now(),
  ttlMs = SESSION_TTL_MS
): Promise<string> {
  const expires = now + ttlMs;
  return `${expires}.${await hmacHex(secret, `jarvis-session:${expires}`)}`;
}

export async function verifySessionToken(
  secret: string,
  token: string,
  now = Date.now()
): Promise<boolean> {
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expires = Number(token.slice(0, dot));
  if (!Number.isFinite(expires) || expires <= now) return false;
  const expected = await hmacHex(secret, `jarvis-session:${expires}`);
  return constantTimeEqual(token.slice(dot + 1), expected);
}

function cookieValue(req: Request, name: string): string {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return "";
}

/**
 * Route-side check: is this request an authenticated USER? True when auth
 * is disabled (local-first) or when the session cookie verifies. Device
 * tokens are a separate authority, checked by the routes that accept them.
 */
export async function isAuthorizedUser(req: Request): Promise<boolean> {
  const secret = authSecret();
  if (!secret) return true;
  return verifySessionToken(secret, cookieValue(req, SESSION_COOKIE));
}
