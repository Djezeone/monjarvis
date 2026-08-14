import { NextResponse } from "next/server";
import { coreUrl, deploymentRole } from "@/server/deployment";

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
    return NextResponse.json({ role, coreConfigured: false, coreReachable: false });
  }
  let reachable = false;
  try {
    // Any HTTP answer proves the brain is up — a Core protected by auth
    // legitimately answers 401 to this cookie-less server-side probe.
    const r = await fetch(`${core}/api/jarvis/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    reachable = r.status < 500;
  } catch {
    reachable = false;
  }
  return NextResponse.json({ role, coreConfigured: true, coreReachable: reachable });
}
