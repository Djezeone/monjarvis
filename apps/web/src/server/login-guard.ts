/**
 * P9 brick 2 — hardening the façade login.
 *
 * Once the façade is on a public URL, `/api/jarvis/auth/login` is the
 * single door to everything JARVIS can do, and it is guarded by a secret
 * YOU chose. Unlimited attempts against a human-chosen secret is the
 * weakest link in the whole chain. Three answers, in order of strength:
 *
 *   1. ENTROPY — a secret below the floor is refused at the door and the
 *      façade fails CLOSED (nobody gets in) rather than pretending to be
 *      protected. No brute-force defence beats a guessable secret.
 *   2. COST — each attempt derives a key (PBKDF2, 200k iterations), so an
 *      attacker pays ~100 ms of CPU per guess. This works on serverless,
 *      where counters do not.
 *   3. FRICTION — a best-effort attempt limiter. On a single Core it is a
 *      real lockout; on serverless it is per-instance only, which is why
 *      it comes third and never alone.
 *
 * Pure module: Web Crypto only, so the same code runs on node and edge.
 */

/** Long enough that guessing is hopeless even at a million tries a second. */
export const MIN_SECRET_LENGTH = 24;

const WEAK_PATTERNS = [
  /^changeme/i,
  /^password/i,
  /^secret/i,
  /^jarvis/i,
  /^admin/i,
  /^(.)\1+$/,
];

export function secretStrength(secret: string): { ok: boolean; reason: string } {
  const value = (secret || "").trim();
  if (value.length < MIN_SECRET_LENGTH) {
    return {
      ok: false,
      reason: `JARVIS_AUTH_SECRET fait ${value.length} caractères — ${MIN_SECRET_LENGTH} minimum. La façade refuse d'ouvrir plutôt que de se prétendre protégée.`,
    };
  }
  if (WEAK_PATTERNS.some((p) => p.test(value))) {
    return {
      ok: false,
      reason:
        "JARVIS_AUTH_SECRET commence par un mot devinable (changeme, password, secret, jarvis, admin) ou répète un caractère.",
    };
  }
  return { ok: true, reason: "" };
}

const PBKDF2_ITERATIONS = 200_000;
const SALT = new TextEncoder().encode("jarvis-x2-login-guard");

/** Derive a comparable proof — deliberately slow, to price each guess. */
async function derive(secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: SALT, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

/** Constant-time comparison of two slow-derived proofs. */
export async function slowSecretEqual(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([derive(given), derive(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface AttemptState {
  /** Failed attempt timestamps (ms), per caller key. */
  [key: string]: number[];
}

export interface LimiterOptions {
  maxAttempts: number;
  windowMs: number;
}

export const DEFAULT_LIMITER: LimiterOptions = { maxAttempts: 10, windowMs: 15 * 60_000 };

/**
 * Pure limiter step: given past failures, decide whether this caller may
 * try again. Returns the pruned state so the caller can store it back.
 */
export function checkAttempts(
  state: AttemptState,
  key: string,
  now: number,
  opts: LimiterOptions = DEFAULT_LIMITER
): { blocked: boolean; retryAfterSeconds: number; state: AttemptState } {
  const recent = (state[key] || []).filter((t) => now - t < opts.windowMs);
  const next: AttemptState = { ...state, [key]: recent };
  if (recent.length < opts.maxAttempts) {
    return { blocked: false, retryAfterSeconds: 0, state: next };
  }
  const oldest = Math.min(...recent);
  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000)),
    state: next,
  };
}

export function recordFailure(state: AttemptState, key: string, now: number): AttemptState {
  return { ...state, [key]: [...(state[key] || []), now] };
}

export function clearAttempts(state: AttemptState, key: string): AttemptState {
  const next = { ...state };
  delete next[key];
  return next;
}
