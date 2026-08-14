import { NextResponse } from "next/server";
import { deliverMessage } from "@/server/deliver";
import type { DeliveryModality } from "@/server/presence-router";

export const dynamic = "force-dynamic";

/**
 * P4 output routing: deliver a message to the RIGHT satellite. Shared logic
 * lives in src/server/deliver.ts (also used by P5 routines).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const message = String(body.message || "").trim();
  const modality: DeliveryModality =
    body.modality === "notification" ? "notification" : "voice";
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const outcome = deliverMessage({
    message,
    modality,
    sessionKey: typeof body.sessionKey === "string" ? body.sessionKey : undefined,
    preferredDevice:
      typeof body.preferredDevice === "string" && body.preferredDevice
        ? body.preferredDevice
        : undefined,
  });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
