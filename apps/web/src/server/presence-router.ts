import "server-only";
import { listDevices, type DeviceRecord } from "./device-registry";
import { getSession } from "./session-registry";

/**
 * P4 Presence Bus — output routing: given a delivery (spoken answer or
 * notification), choose WHICH satellite receives it, from real presence
 * facts only. Deterministic ranking, documented and returned as a reason:
 *
 *   1. Session continuity — the session's last device, if online & capable.
 *   2. Explicit preference — caller-preferred device, if online & capable.
 *   3. Foreground device — heartbeat fact foreground=true.
 *   4. Home speaker — a home-node with the speak capability (voice only).
 *   5. Most recently seen capable device.
 *
 * No capable device online → null. The Core never pretends a delivery
 * happened.
 */

export type DeliveryModality = "voice" | "notification";

export const MODALITY_CAPABILITY: Record<DeliveryModality, string> = {
  voice: "speak",
  notification: "notify",
};

export interface RoutingDecision {
  deviceId: string;
  deviceName: string;
  capability: string;
  reason: string;
}

type PresenceRow = ReturnType<typeof listDevices>[number];

function eligible(devices: PresenceRow[], capability: string): PresenceRow[] {
  return devices.filter(
    (d) => d.online && !d.revoked && d.capabilities.includes(capability)
  );
}

export function chooseOutputDevice(input: {
  modality: DeliveryModality;
  sessionKey?: string;
  preferredDevice?: string;
}): RoutingDecision | { error: string } {
  const capability = MODALITY_CAPABILITY[input.modality];
  const candidates = eligible(listDevices(), capability);
  if (candidates.length === 0) {
    return {
      error: `aucun appareil en ligne ne déclare la capability "${capability}" — livraison impossible`,
    };
  }

  const sessionDevice = input.sessionKey
    ? getSession(input.sessionKey)?.lastDevice
    : undefined;

  const continuity = sessionDevice && candidates.find((d) => d.id === sessionDevice);
  if (continuity) {
    return decision(continuity, capability, `continuité de session (dernier appareil : ${continuity.name})`);
  }

  const preferred =
    input.preferredDevice && candidates.find((d) => d.id === input.preferredDevice);
  if (preferred) {
    return decision(preferred, capability, "préférence explicite de l'appelant");
  }

  const foreground = candidates.filter((d) => d.status.foreground === true);
  if (foreground.length > 0) {
    const chosen = mostRecent(foreground);
    return decision(chosen, capability, "appareil actif au premier plan");
  }

  if (input.modality === "voice") {
    const speakers = candidates.filter((d) => d.kind === "home-node");
    if (speakers.length > 0) {
      const chosen = mostRecent(speakers);
      return decision(chosen, capability, "enceinte du foyer disponible");
    }
  }

  const chosen = mostRecent(candidates);
  return decision(chosen, capability, "appareil capable vu le plus récemment");
}

function mostRecent(devices: PresenceRow[]): PresenceRow {
  return devices
    .slice()
    .sort((a, b) => (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? ""))[0];
}

function decision(
  device: Pick<DeviceRecord, "id" | "name">,
  capability: string,
  reason: string
): RoutingDecision {
  return { deviceId: device.id, deviceName: device.name, capability, reason };
}
