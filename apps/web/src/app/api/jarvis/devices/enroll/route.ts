import { NextResponse } from "next/server";
import { createEnrollment } from "@/server/device-registry";

export const dynamic = "force-dynamic";

/**
 * Operator-side: mint a one-time enrollment code (10 min TTL) to hand to a
 * new satellite's device agent. Trust boundary is the cockpit itself — the
 * Core must only ever be reachable over the private mesh, never publicly.
 */
export async function POST() {
  return NextResponse.json(createEnrollment());
}
