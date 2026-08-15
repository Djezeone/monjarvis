/**
 * P7 brick 3 — the proactivity hierarchy.
 *
 * An omnipresent assistant that treats every observation the same becomes
 * unbearable. CBOS names five degrees; JARVIS gives each one a real
 * channel, and the user's `proactivity` preference decides where the line
 * between "kept" and "delivered" falls:
 *
 *   SILENT    → journal only — remembered, never shown unprompted
 *   INFO      → journal — visible in the cockpit when you look
 *   USEFUL    → notification through the Presence Bus
 *   IMPORTANT → interruption: spoken, so it actually reaches you
 *   CRITICAL  → not delivered at all: it demands a decision, and that gate
 *               already exists as the FR-009 approval on device commands
 *
 * Below the threshold nothing is lost — it is journaled, and the cockpit
 * shows it. Above it, the level picks the channel. Caps (FR-010) still
 * apply on top, so a burst of important events cannot turn into spam.
 *
 * Pure module: no filesystem, no server-only import, directly unit-testable.
 */

export const LEVELS = ["silent", "info", "useful", "important", "critical"] as const;

export type ProactivityLevel = (typeof LEVELS)[number];

export type ProactivityChannel = "journal" | "notification" | "interruption" | "approval";

export type ProactivitySetting = "off" | "low" | "normal";

export function levelRank(level: ProactivityLevel): number {
  return LEVELS.indexOf(level);
}

/** The channel a level deserves, independent of any user setting. */
export function channelForLevel(level: ProactivityLevel): ProactivityChannel {
  switch (level) {
    case "silent":
    case "info":
      return "journal";
    case "useful":
      return "notification";
    case "important":
      return "interruption";
    case "critical":
      return "approval";
  }
}

/** How an interruption differs from a notification, concretely. */
export function modalityForChannel(
  channel: ProactivityChannel
): "voice" | "notification" | null {
  if (channel === "notification") return "notification";
  if (channel === "interruption") return "voice";
  return null; // journal and approval never go through the output router
}

/**
 * Lowest level the user accepts being reached at. `off` accepts nothing —
 * JARVIS keeps quiet entirely. Anything below the threshold is journaled.
 */
export function deliveryThreshold(setting: ProactivitySetting): ProactivityLevel | null {
  if (setting === "off") return null;
  return setting === "low" ? "important" : "useful";
}

export function shouldDeliver(
  level: ProactivityLevel,
  setting: ProactivitySetting
): boolean {
  const threshold = deliveryThreshold(setting);
  if (threshold === null) return false;
  // CRITICAL is never "delivered": it waits for an explicit human decision.
  if (channelForLevel(level) === "approval") return false;
  return levelRank(level) >= levelRank(threshold);
}

/** FR-010 anti-spam: deliveries allowed per rolling hour, by setting. */
export function deliveryCapPerHour(setting: ProactivitySetting): number {
  if (setting === "off") return 0;
  return setting === "low" ? 1 : 4;
}

/** One-line explanation shown next to each item — never a silent decision. */
export function explain(level: ProactivityLevel, setting: ProactivitySetting): string {
  const channel = channelForLevel(level);
  if (channel === "approval") return "demande votre décision (FR-009)";
  if (!shouldDeliver(level, setting)) {
    return setting === "off"
      ? "journalisée — proactivité désactivée"
      : `journalisée — niveau ${level} sous le seuil « ${deliveryThreshold(setting)} »`;
  }
  return channel === "interruption"
    ? "interruption — annoncée à voix haute"
    : "notification";
}
