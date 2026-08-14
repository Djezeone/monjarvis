import { NextResponse, type NextRequest } from "next/server";
import { authSecret, SESSION_COOKIE, verifySessionToken } from "@/server/facade-auth";

/**
 * P6 brick 1 — façade gate. With JARVIS_AUTH_SECRET set, /app and
 * /api/jarvis/* require a user session. The middleware only STEERS —
 * authority is always re-verified in the routes:
 *
 * - /api/jarvis/auth/*             → open (login/status/logout)
 * - /api/jarvis/devices/enroll/claim → open (the one-shot code is the proof)
 * - device heartbeat/commands, /run  → pass IF a device token header is
 *   present; the route then enforces it with timingSafeEqual — a bogus
 *   header passes the gate but fails the route with 401.
 * - everything else                → session cookie required.
 */

const OPEN_PATHS = [/^\/api\/jarvis\/auth\//, /^\/api\/jarvis\/devices\/enroll\/claim$/];

const DEVICE_TOKEN_PATHS = [
  /^\/api\/jarvis\/devices\/[^/]+\/(heartbeat|commands)(\/.*)?$/,
  /^\/api\/jarvis\/run(\/.*)?$/,
];

export async function middleware(req: NextRequest) {
  const secret = authSecret();
  if (!secret) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (OPEN_PATHS.some((p) => p.test(pathname))) return NextResponse.next();
  if (
    DEVICE_TOKEN_PATHS.some((p) => p.test(pathname)) &&
    req.headers.get("x-jarvis-device-token")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value || "";
  if (await verifySessionToken(secret, token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "authentification requise" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/app/:path*", "/api/jarvis/:path*"],
};
