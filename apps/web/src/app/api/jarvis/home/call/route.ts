import { NextResponse } from "next/server";
import { callHomeService } from "@/server/home-registry";

export const dynamic = "force-dynamic";

/**
 * Act on the physical world. Guarded domains (locks, alarms, covers,
 * climate) and irreversible services answer 428 until an explicit approval
 * is attached — same contract as device dispatch and n8n workflows.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outcome = await callHomeService({
    entityId: String(body.entityId || ""),
    service: String(body.service || ""),
    data: body.data && typeof body.data === "object" ? body.data : undefined,
    approvedBy:
      typeof body.approvedBy === "string" && body.approvedBy.trim()
        ? body.approvedBy.trim()
        : undefined,
  });
  if ("error" in outcome) {
    return NextResponse.json(
      { error: outcome.error, requiresApproval: outcome.requiresApproval },
      { status: outcome.status }
    );
  }
  return NextResponse.json(outcome);
}
