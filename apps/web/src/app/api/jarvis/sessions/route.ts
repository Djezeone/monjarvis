import { NextResponse } from "next/server";
import { listSessions } from "@/server/session-registry";

export const dynamic = "force-dynamic";

/**
 * Recent conversation sessions with their cross-device activity — the list
 * any surface uses to offer "reprendre ici" (P4 session handoff).
 */
export async function GET() {
  return NextResponse.json({ sessions: listSessions() });
}
