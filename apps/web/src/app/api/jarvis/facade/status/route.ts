import { NextResponse } from "next/server";
import { coreUrl, deploymentRole } from "@/server/deployment";
import { RELAY_HEADER, relaySecret, signRelay } from "@/server/relay-guard";

export const dynamic = "force-dynamic";

/**
 * P6 brick 2 — honest deployment status, answered locally (never proxied):
 * which role this instance plays, and — façade-side — whether the brain is
 * actually reachable right now. Foundation for the brick-3 offline banner.
 */
export async function GET() {
  const role = deploymentRole();
  if (role === "core") {
    return NextResponse.json({ role, coreConfigured: true, coreReachable: true });
  }

  const core = coreUrl();
  if (!core) {
    return NextResponse.json({ role, coreConfigured: false, coreReachable: false, relay: "off" });
  }

  // P10: the probe signs itself like any other hop. Without this, a Core
  // that seals us out answers 403 — an HTTP answer — and the façade would
  // report « cerveau joignable » while every real call failed. The verdict
  // below separates « le cerveau répond » from « il nous accepte ».
  const secret = relaySecret();
  const path = "/api/jarvis/health";
  const headers: Record<string, string> = secret
    ? { [RELAY_HEADER]: await signRelay(secret, "GET", path) }
    : {};

  let reachable = false;
  let relay: "off" | "ok" | "refused" = secret ? "ok" : "off";
  try {
    // Any HTTP answer proves the brain is up — a Core protected by auth
    // legitimately answers 401 to this cookie-less server-side probe.
    const r = await fetch(`${core}${path}`, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(2500),
    });
    reachable = r.status < 500;
    if (r.status === 403) {
      const body = await r.json().catch(() => null);
      if (body && typeof body.relay === "string") relay = "refused";
    }
  } catch {
    reachable = false;
  }
  return NextResponse.json({ role, coreConfigured: true, coreReachable: reachable, relay });
}
