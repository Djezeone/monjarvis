import "server-only";
import { PolicyEngine } from "@/jarvis/server/policy/PolicyEngine";
import { enqueueCommand, type DeviceCommand } from "@/server/device-registry";
import {
  chooseOutputDevice,
  type DeliveryModality,
  type RoutingDecision,
} from "@/server/presence-router";
import { getPreferences, isQuietNow } from "@/server/preference-store";
import { broadcastPush } from "@/server/push-store";

const policy = new PolicyEngine();

/**
 * Shared delivery path (route + routines): quiet-hours downgrade, Presence
 * Bus routing, policy check, command queueing. No capable device online →
 * explicit error, never a silent drop.
 *
 * P6 brick 5 — notifications are ALSO web-pushed to subscribed browsers
 * (phone hears JARVIS with the app closed), and when no capable satellite
 * is online, push becomes the honest routing fallback: the delivery only
 * reports success once the push service accepted at least one send.
 */
export async function deliverMessage(input: {
  message: string;
  modality: DeliveryModality;
  sessionKey?: string;
  preferredDevice?: string;
}): Promise<
  | {
      routing: RoutingDecision;
      command?: DeviceCommand;
      webPush?: { sent: number; pruned: number };
    }
  | { error: string; status: number }
> {
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
  if ("error" in routing) {
    // No capable satellite: web push is the last honest resort for a
    // notification — success only if the push service really accepted.
    if (modality === "notification") {
      const push = await broadcastPush({ title: "JARVIS", body: input.message });
      if (push.configured && push.sent > 0) {
        return {
          routing: {
            deviceId: "web-push",
            deviceName: "notifications push",
            capability: "notify",
            reason: `aucun satellite capable en ligne — notification poussée vers ${push.sent} navigateur(s) abonné(s)${quietNote}`,
          },
          webPush: { sent: push.sent, pruned: push.pruned },
        };
      }
    }
    return { error: routing.error, status: 503 };
  }

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

  // Delivered to a satellite — mirror notifications to subscribed browsers
  // too, so the phone gets them even with the PWA closed.
  let webPush: { sent: number; pruned: number } | undefined;
  if (modality === "notification") {
    const push = await broadcastPush({ title: "JARVIS", body: input.message });
    if (push.configured) webPush = { sent: push.sent, pruned: push.pruned };
  }
  return {
    routing: { ...routing, reason: `${routing.reason}${quietNote}` },
    command: outcome,
    webPush,
  };
}
