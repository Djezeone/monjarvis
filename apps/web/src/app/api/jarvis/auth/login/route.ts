import { NextResponse } from "next/server";
import { authSecret, createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from "@/server/facade-auth";
import {
  checkAttempts,
  clearAttempts,
  recordFailure,
  secretStrength,
  slowSecretEqual,
  type AttemptState,
} from "@/server/login-guard";

export const dynamic = "force-dynamic";

/**
 * Best-effort attempt memory. On a single resident Core this is a real
 * lockout; on serverless each instance keeps its own, which is exactly why
 * it is the THIRD line of defence — behind the entropy floor and the
 * per-attempt cost, both of which hold everywhere.
 */
let attempts: AttemptState = {};

function callerKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "inconnu";
}

export async function POST(req: Request) {
  const secret = authSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "auth désactivée (JARVIS_AUTH_SECRET absent)" },
      { status: 409 }
    );
  }

  // Fail CLOSED on a weak secret: refusing everyone is safer than letting
  // a guessable door pass for a locked one.
  const strength = secretStrength(secret);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.reason }, { status: 503 });
  }

  const key = callerKey(req);
  const now = Date.now();
  const gate = checkAttempts(attempts, key, now);
  attempts = gate.state;
  if (gate.blocked) {
    return NextResponse.json(
      { error: "trop de tentatives — réessayez plus tard" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const given = String(body.secret || "");
  if (!(await slowSecretEqual(given, secret))) {
    attempts = recordFailure(attempts, key, now);
    return NextResponse.json({ error: "secret invalide" }, { status: 401 });
  }

  attempts = clearAttempts(attempts, key);
  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only when actually served over HTTPS (Vercel/relay) — a local
    // http Core would otherwise never receive the cookie back.
    secure: req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
