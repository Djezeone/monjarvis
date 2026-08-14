import { NextResponse } from "next/server";
import { broadcastPush } from "@/server/push-store";

export const dynamic = "force-dynamic";

/** Real end-to-end proof: pushes an actual notification to every browser. */
export async function POST() {
  const outcome = await broadcastPush({
    title: "JARVIS",
    body: "Test push — le canal fonctionne, même app fermée.",
  });
  if (!outcome.configured) {
    return NextResponse.json(
      { error: "push non configuré (clés VAPID absentes)" },
      { status: 503 }
    );
  }
  return NextResponse.json(outcome);
}
