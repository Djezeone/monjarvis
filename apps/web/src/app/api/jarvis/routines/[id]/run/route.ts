import { NextResponse } from "next/server";
import { getRoutine } from "@/server/routine-registry";
import { executeRoutine } from "@/server/routine-scheduler";

export const dynamic = "force-dynamic";

/** Manual trigger (« Exécuter maintenant ») — same path as the scheduler. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const routine = getRoutine(id);
  if (!routine) return NextResponse.json({ error: "unknown routine" }, { status: 404 });
  const outcome = await executeRoutine(routine);
  return NextResponse.json({ outcome });
}
