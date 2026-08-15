import { NextResponse } from "next/server";
import { authSecret, isAuthorizedUser } from "@/server/facade-auth";
import { secretStrength } from "@/server/login-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = authSecret();
  const enabled = Boolean(secret);
  const strength = enabled ? secretStrength(secret) : { ok: true, reason: "" };
  return NextResponse.json({
    enabled,
    authenticated: enabled ? await isAuthorizedUser(req) : true,
    // Surfaced so the login page can state the problem instead of just
    // refusing — a locked door with no explanation is a bug report.
    secretStrong: strength.ok,
    secretIssue: strength.reason,
  });
}
