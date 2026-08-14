import { NextResponse } from "next/server";
import { PolicyEngine } from "@/jarvis/server/policy/PolicyEngine";
import { enqueueCommand } from "@/server/device-registry";
import {
  chooseOutputDevice,
  type DeliveryModality,
} from "@/server/presence-router";
import { getPreferences, isQuietNow } from "@/server/preference-store";

export const dynamic = "force-dynamic";

const policy = new PolicyEngine();

/**
 * P4 output routing: deliver a message to the RIGHT satellite. The Presence
 * Bus picks the device (session continuity → explicit preference →
 * foreground → home speaker → recency) and the command goes through the
 * same policy-checked queue as any dispatch. No capable device online →
 * explicit 503, never a silent drop.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const message = String(body.message || "").trim();
  let modality: DeliveryModality =
    body.modality === "notification" ? "notification" : "voice";
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  // P5: quiet hours downgrade voice to a silent notification.
  const prefs = getPreferences();
  let quietNote = "";
  if (modality === "voice" && isQuietNow(prefs)) {
    modality = "notification";
    quietNote = " — heures calmes: voix remplacée par une notification";
  }

  const routing = chooseOutputDevice({
    modality,
    sessionKey: typeof body.sessionKey === "string" ? body.sessionKey : undefined,
    preferredDevice:
      typeof body.preferredDevice === "string" && body.preferredDevice
        ? body.preferredDevice
        : prefs.preferredDevice || undefined,
  });
  if ("error" in routing) {
    return NextResponse.json({ error: routing.error }, { status: 503 });
  }

  const decision = policy.decideDeviceCapability(routing.capability);
  const args =
    modality === "voice"
      ? { text: message }
      : { title: "JARVIS", message };
  const outcome = enqueueCommand({
    deviceId: routing.deviceId,
    capability: routing.capability,
    args,
    policy: { tier: "ACT", reason: decision.reason },
  });
  if ("status" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json({
    routing: { ...routing, reason: `${routing.reason}${quietNote}` },
    command: outcome,
  });
}
