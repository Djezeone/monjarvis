/**
 * P10 brick 1 — the sealed façade↔Core link.
 *
 * The hole this closes is written in our own runbook. `deploy/core/README.md`
 * §7 says « la façade doit joindre le Core, le monde non » and then offers
 * three *infrastructure* answers (Tailscale, tunnel, firewall). Nothing in
 * the code enforced it. A Core reachable through a tunnel or on a VPS port
 * offered its whole authority surface to whoever found the address: the
 * login endpoint to brute-force, `devices/enroll/claim` to try codes
 * against, every route behind a cookie the attacker was free to attempt.
 * The only wall was the auth secret — one secret, on an open door.
 *
 * The seal adds a second, independent wall: when JARVIS_RELAY_SECRET is
 * set, the Core answers /api/jarvis/* ONLY to a caller that can sign the
 * request. The façade signs; nobody else can.
 *
 * What is signed — and why each piece is there:
 *
 *   jarvis-relay:${timestamp}:${METHOD}:${pathname}
 *
 * - timestamp → a captured header dies within the window (clock skew
 *   between Vercel and a home Core is real, hence minutes, not seconds);
 * - method + pathname → a header captured on a harmless GET cannot be
 *   replayed onto a POST, nor onto another route. Binding matters: a
 *   bearer token that authorises "anything" is what we are replacing.
 *
 * Two deliberate non-goals, stated so nobody mistakes this for more than
 * it is:
 *
 * - it is NOT end-to-end confidentiality. The relay secret proves *who*
 *   calls, not what they may do — the session cookie and device tokens
 *   still decide that, re-verified Core-side as before.
 * - it does NOT protect the body. A machine-in-the-middle able to alter
 *   payloads has already broken TLS, which is a different failure.
 *
 * Pure module, Web Crypto only: the edge middleware imports it.
 */

import { constantTimeEqual } from "@/server/facade-auth";

export const RELAY_HEADER = "x-jarvis-relay";

/** Clock skew tolerance between the façade and the Core. */
export const RELAY_WINDOW_MS = 5 * 60_000;

export function relaySecret(): string {
  return process.env.JARVIS_RELAY_SECRET?.trim() || "";
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

function payloadOf(ts: number, method: string, pathname: string): string {
  return `jarvis-relay:${ts}:${method.toUpperCase()}:${pathname}`;
}

/** `${timestamp}.${hmac}` — what the façade puts in x-jarvis-relay. */
export async function signRelay(
  secret: string,
  method: string,
  pathname: string,
  now = Date.now()
): Promise<string> {
  return `${now}.${await hmacHex(secret, payloadOf(now, method, pathname))}`;
}

export type RelayVerdict = "ok" | "absent" | "malformé" | "expiré" | "invalide";

/**
 * Verdicts are distinct on purpose. « expiré » and « invalide » tell an
 * attacker nothing they could not learn by trying, and they tell the
 * operator the two things that actually go wrong in the field apart:
 * a clock that drifted, versus a secret that does not match.
 */
export async function verifyRelay(input: {
  secret: string;
  method: string;
  pathname: string;
  header: string | null;
  now?: number;
  windowMs?: number;
}): Promise<RelayVerdict> {
  const header = (input.header || "").trim();
  if (!header) return "absent";
  const dot = header.indexOf(".");
  if (dot <= 0) return "malformé";
  const ts = Number(header.slice(0, dot));
  if (!Number.isFinite(ts)) return "malformé";

  const now = input.now ?? Date.now();
  const windowMs = input.windowMs ?? RELAY_WINDOW_MS;
  if (Math.abs(now - ts) > windowMs) return "expiré";

  const expected = await hmacHex(input.secret, payloadOf(ts, input.method, input.pathname));
  return (await constantTimeEqual(header.slice(dot + 1), expected)) ? "ok" : "invalide";
}

/**
 * Which requests the seal covers, Core-side.
 *
 * Only the authority surface — /api/jarvis/* — and only when the caller
 * is not a satellite. Two consequences we own rather than hide:
 *
 * - satellites (device agents, home node) carry their own per-device
 *   token, verified with timingSafeEqual by the routes. That is a
 *   stronger, per-device proof than a shared secret; requiring the relay
 *   header on top would lock every satellite out of its own Core for no
 *   gain. A forged token header skips this guard and meets the route,
 *   which answers 401 — the seal shrinks the anonymous surface, it does
 *   not replace the gates behind it.
 * - /app and the landing stay served: turning the seal on means the Core's
 *   API answers the façade only, so the cockpit is used through the
 *   façade's address — at home too. That is the trade, stated plainly.
 */
export function relayCovers(pathname: string, deviceToken: string | null): boolean {
  if (!pathname.startsWith("/api/jarvis/")) return false;
  return !deviceToken;
}
