import { NextResponse } from "next/server";
import {
  authSecret,
  constantTimeEqual,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/server/facade-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = authSecret();
  if (!secret) {
    return NextResponse.json({ error: "auth désactivée (JARVIS_AUTH_SECRET absent)" }, { status: 409 });
  }
  const body = await req.json().catch(() => ({}));
  const given = String(body.secret || "");
  if (!(await constantTimeEqual(given, secret))) {
    return NextResponse.json({ error: "secret invalide" }, { status: 401 });
  }

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
