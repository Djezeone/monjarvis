/**
 * Pure suggestion rules — no filesystem, no server-only import, directly
 * unit-testable (scripts/test-suggestions.mjs). Every rule observes REAL
 * system state; nothing speculative.
 */

import type { ProactivityLevel } from "@/server/proactivity";

export interface SuggestionCandidate {
  /** Stable identity: one suggestion per (kind, subject) until resolved. */
  kind: "device-offline" | "command-failed";
  subject: string;
  message: string;
  /** P7 brick 3: how loudly this deserves to reach the user. */
  level: ProactivityLevel;
}

export interface DeviceView {
  id: string;
  name: string;
  online: boolean;
  revoked: boolean;
  lastSeenAt: string | null;
}

export interface CommandView {
  id: string;
  deviceId: string;
  capability: string;
  state: string;
  error?: string;
  updatedAt: string;
}

/**
 * A device that used to be seen but has been silent longer than the
 * threshold. Losing the PREFERRED output device is important — JARVIS's
 * own voice would land nowhere — while any other satellite is journal-level.
 */
export function offlineDeviceCandidates(
  devices: DeviceView[],
  now: Date,
  thresholdMinutes: number,
  preferredDeviceId = ""
): SuggestionCandidate[] {
  return devices
    .filter(
      (d) =>
        !d.revoked &&
        !d.online &&
        d.lastSeenAt !== null &&
        now.getTime() - new Date(d.lastSeenAt).getTime() >= thresholdMinutes * 60_000
    )
    .map((d) => ({
      kind: "device-offline" as const,
      subject: d.id,
      message: `Le satellite « ${d.name} » est hors ligne depuis ${new Date(d.lastSeenAt as string).toLocaleTimeString()}.${
        d.id === preferredDeviceId && preferredDeviceId ? " C'est votre appareil de sortie par défaut." : ""
      }`,
      level:
        preferredDeviceId && d.id === preferredDeviceId
          ? ("important" as const)
          : ("info" as const),
    }));
}

/** A dispatched command that the device reported as failed, recently. */
export function failedCommandCandidates(
  commands: CommandView[],
  now: Date,
  windowMinutes: number
): SuggestionCandidate[] {
  return commands
    .filter(
      (c) =>
        c.state === "failed" &&
        now.getTime() - new Date(c.updatedAt).getTime() <= windowMinutes * 60_000
    )
    .map((c) => ({
      kind: "command-failed" as const,
      subject: c.id,
      message: `La commande ${c.capability} sur « ${c.deviceId} » a échoué${c.error ? ` : ${c.error}` : "."}`,
      // An action you asked for did not happen: worth a notification.
      level: "useful" as const,
    }));
}
