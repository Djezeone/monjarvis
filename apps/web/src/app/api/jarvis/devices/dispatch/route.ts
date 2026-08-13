import { NextResponse } from "next/server";
import { PolicyEngine } from "@/jarvis/server/policy/PolicyEngine";
import { enqueueCommand } from "@/server/device-registry";

export const dynamic = "force-dynamic";

const policy = new PolicyEngine();

/**
 * Core → satellite dispatch ("cerveau ici, mains là-bas"). Every dispatch
 * passes the Policy Engine: CRITICAL capabilities are enqueued only with an
 * explicit operator approval attached — presentation state never grants
 * execution authority.
 */
export async function POST(req: Request) {
  if (!process.env.JARVIS_DEVICE_SHARED_SECRET) {
    return NextResponse.json(
      { error: "device fabric not configured (JARVIS_DEVICE_SHARED_SECRET unset)" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const deviceId = String(body.deviceId || "").trim();
  const capability = String(body.capability || "").trim();
  const args =
    body.args && typeof body.args === "object" ? (body.args as Record<string, unknown>) : {};
  if (!deviceId || !capability) {
    return NextResponse.json({ error: "deviceId and capability required" }, { status: 400 });
  }

  const decision = policy.decideDeviceCapability(capability);
  if (!decision.allow) {
    return NextResponse.json({ error: decision.reason }, { status: 403 });
  }
  const approvedBy =
    typeof body.approvedBy === "string" && body.approvedBy.trim()
      ? body.approvedBy.trim()
      : undefined;
  if (decision.requireApproval && !approvedBy) {
    return NextResponse.json(
      { error: decision.reason, requiresApproval: true },
      { status: 428 }
    );
  }

  const tier = decision.requireApproval
    ? ("CRITICAL" as const)
    : /^(presence|battery|clipboard\.read|screen\.state)\b/.test(capability)
      ? ("READ" as const)
      : ("ACT" as const);

  const outcome = enqueueCommand({
    deviceId,
    capability,
    args,
    policy: { tier, reason: decision.reason, approvedBy },
  });
  if ("status" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
