import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * P5 Personalization — explicit preference model (brick 1).
 *
 * Honest by construction: every preference here was SET by the user, never
 * inferred. Preferences have real, observable effects — they are injected
 * into every run's instructions and consulted by the output router (quiet
 * hours, preferred device). Inferred/learned preferences are a later brick
 * and will be stored separately with provenance.
 */

export interface QuietHours {
  /** "HH:MM" 24h local time — start of quiet period. */
  start: string;
  /** "HH:MM" — end of quiet period. May wrap past midnight. */
  end: string;
}

export interface Preferences {
  /** Answer language, e.g. "fr". */
  language: string;
  /** Answer tone, free text injected as guidance (e.g. "concis et direct"). */
  tone: string;
  /** During quiet hours, voice deliveries are downgraded to notifications. */
  quietHours: QuietHours | null;
  /** Default output device when a delivery has no explicit preference. */
  preferredDevice: string;
  /** FR-010: proactivity is configurable and must avoid spam. */
  proactivity: "off" | "low" | "normal";
  updatedAt: string | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: "fr",
  tone: "",
  quietHours: null,
  preferredDevice: "",
  proactivity: "low",
  updatedAt: null,
};

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "preferences.json");
}

export function getPreferences(): Preferences {
  const f = dataFile();
  if (!existsSync(f)) return { ...DEFAULT_PREFERENCES };
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(readFileSync(f, "utf8")) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const current = getPreferences();
  const next: Preferences = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(dataFile(), JSON.stringify(next, null, 2));
  return next;
}

/** Are we inside the user's quiet hours right now? Handles midnight wrap. */
export function isQuietNow(prefs: Preferences, now = new Date()): boolean {
  if (!prefs.quietHours) return false;
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h % 24) * 60 + (m % 60);
  };
  const start = toMinutes(prefs.quietHours.start);
  const end = toMinutes(prefs.quietHours.end);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (start === end) return false;
  return start < end ? cur >= start && cur < end : cur >= start || cur < end;
}

/** Instruction line injected into every run so the Core answers your way. */
export function preferenceInstructions(prefs: Preferences): string {
  const parts = [`langue=${prefs.language}`];
  if (prefs.tone.trim()) parts.push(`ton=${prefs.tone.trim()}`);
  return `[Préférences utilisateur: ${parts.join(", ")}]`;
}
