import "server-only";
import { PolicyEngine } from "@/jarvis/server/policy/PolicyEngine";
import { enqueueCommand, type DeviceCommand } from "@/server/device-registry";
import {
  chooseOutputDevice,
  type DeliveryModality,
  type RoutingDecision,
} from "@/server/presence-router";
import { getPreferences, isQuietNow } from "@/server/preference-store";

const policy = new PolicyEngine();

/**
 * Shared delivery path (route + routines): quiet-hours downgrade, Presence
 * Bus routing, policy check, command queueing. No capable device online →
 * explicit error, never a silent drop.
 */
export function deliverMessage(input: {
  message: string;
  modality: DeliveryModality;
  sessionKey?: string;
  preferredDevice?: string;
}):
  | { routing: RoutingDecision; command: DeviceCommand }
  | { error: string; status: number } {
  const prefs = getPreferences();
  let modality = input.modality;
  let quietNote = "";
  if (modality === "voice" && isQuietNow(prefs)) {
    modality = "notification";
    quietNote = " — heures calmes: voix remplacée par une notification";
  }

  const routing = chooseOutputDevice({
    modality,
    sessionKey: input.sessionKey,
    preferredDevice: input.preferredDevice || prefs.preferredDevice || undefined,
  });
  if ("error" in routing) return { error: routing.error, status: 503 };

  const decision = policy.decideDeviceCapability(routing.capability);
  const args =
    modality === "voice"
      ? { text: input.message }
      : { title: "JARVIS", message: input.message };
  const outcome = enqueueCommand({
    deviceId: routing.deviceId,
    capability: routing.capability,
    args,
    policy: { tier: "ACT", reason: decision.reason },
  });
  if ("status" in outcome) return { error: outcome.error, status: outcome.status };
  return {
    routing: { ...routing, reason: `${routing.reason}${quietNote}` },
    command: outcome,
  };
}
