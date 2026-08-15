import { NextResponse } from "next/server";
import { triggerWorkflow } from "@/server/n8n-registry";

export const dynamic = "force-dynamic";

/**
 * Trigger a declared workflow. CRITICAL workflows answer 428 until an
 * explicit approval is attached — same contract as device dispatch.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const input =
    body.input && typeof body.input === "object" ? (body.input as Record<string, unknown>) : {};
  const approvedBy =
    typeof body.approvedBy === "string" && body.approvedBy.trim()
      ? body.approvedBy.trim()
      : undefined;

  const outcome = await triggerWorkflow(id, input, approvedBy);
  if ("error" in outcome) {
    return NextResponse.json(
      { error: outcome.error, requiresApproval: outcome.requiresApproval },
      { status: outcome.status }
    );
  }
  return NextResponse.json(outcome);
}
