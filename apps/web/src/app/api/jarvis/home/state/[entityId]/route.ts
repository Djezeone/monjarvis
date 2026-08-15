import { NextResponse } from "next/server";
import { readEntityState } from "@/server/home-registry";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const outcome = await readEntityState(decodeURIComponent(entityId));
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
