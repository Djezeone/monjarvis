/**
 * Pure suggestion rules — no filesystem, no server-only import, directly
 * unit-testable (scripts/test-suggestions.mjs). Every rule observes REAL
 * system state; nothing speculative.
 */

export interface SuggestionCandidate {
  /** Stable identity: one suggestion per (kind, subject) until resolved. */
  kind: "device-offline" | "command-failed";
  subject: string;
  message: string;
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

/** A device that used to be seen but has been silent longer than the threshold. */
export function offlineDeviceCandidates(
  devices: DeviceView[],
  now: Date,
  thresholdMinutes: number
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
      message: `Le satellite « ${d.name} » est hors ligne depuis ${new Date(d.lastSeenAt as string).toLocaleTimeString()}.`,
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
    }));
}

/** FR-010 anti-spam: deliveries allowed per rolling hour, by proactivity. */
export function deliveryCapPerHour(proactivity: "off" | "low" | "normal"): number {
  if (proactivity === "off") return 0;
  return proactivity === "low" ? 1 : 4;
}
