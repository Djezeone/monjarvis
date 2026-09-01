import { NextResponse, type NextRequest } from "next/server";
import { authSecret, SESSION_COOKIE, verifySessionToken } from "@/server/facade-auth";
import { coreUrl, deploymentRole } from "@/server/deployment";
import { isStateChanging, originAllowed, trustedOrigins } from "@/server/origin-guard";
import {
  RELAY_HEADER,
  relayCovers,
  relaySecret,
  signRelay,
  verifyRelay,
} from "@/server/relay-guard";

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
 *
 * P6 brick 2 — with JARVIS_ROLE=facade, every /api/jarvis/* request that
 * passes the gate is then PROXIED to JARVIS_CORE_URL (rewrite), cookies
 * and device tokens forwarded verbatim: the state lives at the Core, and
 * with the same JARVIS_AUTH_SECRET on both sides the Core re-verifies the
 * very same session cookie. Auth and facade/status routes stay local.
 */

const OPEN_PATHS = [/^\/api\/jarvis\/auth\//, /^\/api\/jarvis\/devices\/enroll\/claim$/];

/** Routes the façade answers itself — never proxied to the Core. */
const FACADE_LOCAL_PATHS = [/^\/api\/jarvis\/auth\//, /^\/api\/jarvis\/facade\//];

async function facadeRewrite(req: NextRequest): Promise<NextResponse> {
  const core = coreUrl();
  if (!core) {
    return NextResponse.json(
      { error: "JARVIS_CORE_URL manquant — la façade n'a pas de cerveau configuré" },
      { status: 503 }
    );
  }
  const { pathname, search } = req.nextUrl;
  const target = new URL(`${pathname}${search}`, core);

  // P10: sign the hop when a relay secret is configured. Unsigned when it
  // is not — an unsealed Core is exactly as reachable as before.
  const relay = relaySecret();
  if (!relay) return NextResponse.rewrite(target);

  const headers = new Headers(req.headers);
  headers.set(RELAY_HEADER, await signRelay(relay, req.method, pathname));
  return NextResponse.rewrite(target, { request: { headers } });
}

async function forwardOrNext(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (
    deploymentRole() === "facade" &&
    pathname.startsWith("/api/jarvis/") &&
    !FACADE_LOCAL_PATHS.some((p) => p.test(pathname))
  ) {
    return facadeRewrite(req);
  }
  return NextResponse.next();
}

/**
 * P10 — the seal, Core-side. Runs before authentication: a caller who
 * cannot sign never reaches the login endpoint at all, so an exposed Core
 * offers nothing to brute-force. The verdict travels in the body so a
 * misconfigured façade is diagnosable (drifted clock vs wrong secret)
 * instead of silently broken.
 */
async function relayRefusal(req: NextRequest): Promise<NextResponse | null> {
  const secret = relaySecret();
  if (!secret || deploymentRole() !== "core") return null;

  const { pathname } = req.nextUrl;
  if (!relayCovers(pathname, req.headers.get("x-jarvis-device-token"))) return null;

  const verdict = await verifyRelay({
    secret,
    method: req.method,
    pathname,
    header: req.headers.get(RELAY_HEADER),
  });
  if (verdict === "ok") return null;

  return NextResponse.json(
    { error: `lien de relais refusé (${verdict}) — ce Core ne répond qu'à sa façade`, relay: verdict },
    { status: 403 }
  );
}

const DEVICE_TOKEN_PATHS = [
  /^\/api\/jarvis\/devices\/[^/]+\/(heartbeat|commands)(\/.*)?$/,
  /^\/api\/jarvis\/run(\/.*)?$/,
];

export async function middleware(req: NextRequest) {
  // P9: the origin guard runs FIRST and in every mode — including
  // local-first, where there is no cookie to withhold from a foreign site.
  if (
    isStateChanging(req.method) &&
    !originAllowed({
      origin: req.headers.get("origin"),
      host: req.headers.get("host"),
      trusted: trustedOrigins(process.env.JARVIS_TRUSTED_ORIGINS),
    })
  ) {
    return NextResponse.json(
      { error: "origine non autorisée — requête refusée" },
      { status: 403 }
    );
  }

  const refused = await relayRefusal(req);
  if (refused) return refused;

  const secret = authSecret();
  if (!secret) return forwardOrNext(req);

  const { pathname } = req.nextUrl;
  if (OPEN_PATHS.some((p) => p.test(pathname))) return forwardOrNext(req);
  if (
    DEVICE_TOKEN_PATHS.some((p) => p.test(pathname)) &&
    req.headers.get("x-jarvis-device-token")
  ) {
    return forwardOrNext(req);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value || "";
  if (await verifySessionToken(secret, token)) return forwardOrNext(req);

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "authentification requise" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/app/:path*", "/api/jarvis/:path*"],
};
