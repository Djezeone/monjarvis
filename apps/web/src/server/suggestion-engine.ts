import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { listDevices, listCommands } from "@/server/device-registry";
import { getPreferences } from "@/server/preference-store";
import { deliverMessage } from "@/server/deliver";
import {
  failedCommandCandidates,
  offlineDeviceCandidates,
  type SuggestionCandidate,
} from "@/server/suggestion-rules";
import {
  channelForLevel,
  deliveryCapPerHour,
  explain,
  modalityForChannel,
  shouldDeliver,
  type ProactivityLevel,
} from "@/server/proactivity";

/**
 * P5 brick 3 — proactive suggestions: JARVIS raises what deserves attention
 * (a satellite went silent, a dispatched command failed), capped hard by the
 * user's proactivity preference (FR-010: avoid spam):
 *   off    → the sweep does nothing at all — zero unsolicited messages
 *   low    → at most 1 delivery per rolling hour
 *   normal → at most 4 deliveries per rolling hour
 * Suggestions are delivered as notifications through the Presence Bus (a
 * suggestion never speaks), deduplicated per (kind, subject), dismissible.
 */

export interface Suggestion {
  id: string;
  kind: SuggestionCandidate["kind"];
  subject: string;
  message: string;
  /** P7 brick 3: the degree that decided the channel. */
  level: ProactivityLevel;
  /** Why it was journaled, notified or announced — stated, never implicit. */
  decision: string;
  createdAt: string;
  deliveredAt: string | null;
  deliveredTo: string | null;
  dismissedAt: string | null;
}

interface SuggestionsFile {
  suggestions: Suggestion[];
  /** ISO timestamps of past deliveries, for the rolling-hour cap. */
  deliveryLog: string[];
}

const OFFLINE_THRESHOLD_MIN = Number(process.env.JARVIS_SUGGEST_OFFLINE_MIN || 10);
const FAILED_WINDOW_MIN = Number(process.env.JARVIS_SUGGEST_FAILED_WINDOW_MIN || 60);

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "suggestions.json");
}

function load(): SuggestionsFile {
  const f = dataFile();
  if (!existsSync(f)) return { suggestions: [], deliveryLog: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as SuggestionsFile;
  } catch {
    return { suggestions: [], deliveryLog: [] };
  }
}

function save(state: SuggestionsFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function listSuggestions(): Suggestion[] {
  return load()
    .suggestions.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

export function dismissSuggestion(id: string): Suggestion | null {
  const state = load();
  const suggestion = state.suggestions.find((s) => s.id === id);
  if (!suggestion) return null;
  suggestion.dismissedAt = new Date().toISOString();
  save(state);
  return suggestion;
}

/**
 * One sweep: observe real state, register new suggestions (deduplicated),
 * deliver pending ones under the hourly cap. Returns an honest report.
 */
export async function sweepSuggestions(now = new Date()): Promise<{
  generated: number;
  delivered: number;
  journaled: number;
  capped: number;
  proactivity: string;
}> {
  const prefs = getPreferences();
  if (prefs.proactivity === "off") {
    return { generated: 0, delivered: 0, journaled: 0, capped: 0, proactivity: "off" };
  }

  const state = load();

  const candidates: SuggestionCandidate[] = [
    ...offlineDeviceCandidates(
      listDevices(),
      now,
      OFFLINE_THRESHOLD_MIN,
      prefs.preferredDevice
    ),
    ...failedCommandCandidates(listCommands(), now, FAILED_WINDOW_MIN),
  ];

  let generated = 0;
  for (const candidate of candidates) {
    const existing = state.suggestions.find(
      (s) => s.kind === candidate.kind && s.subject === candidate.subject && !s.dismissedAt
    );
    if (existing) continue;
    state.suggestions.push({
      id: randomUUID(),
      ...candidate,
      decision: explain(candidate.level, prefs.proactivity),
      createdAt: now.toISOString(),
      deliveredAt: null,
      deliveredTo: null,
      dismissedAt: null,
    });
    generated++;
  }

  const hourAgo = now.getTime() - 60 * 60_000;
  state.deliveryLog = state.deliveryLog.filter((t) => new Date(t).getTime() > hourAgo);
  const cap = deliveryCapPerHour(prefs.proactivity);
  let budget = Math.max(0, cap - state.deliveryLog.length);

  let delivered = 0;
  let journaled = 0;
  let capped = 0;
  for (const suggestion of state.suggestions) {
    if (suggestion.deliveredAt || suggestion.dismissedAt) continue;

    // Below the user's threshold: kept, visible in the cockpit, never
    // pushed. Nothing is lost — it simply does not interrupt.
    if (!shouldDeliver(suggestion.level, prefs.proactivity)) {
      suggestion.decision = explain(suggestion.level, prefs.proactivity);
      journaled++;
      continue;
    }
    if (budget <= 0) {
      suggestion.decision = "plafond horaire atteint — livraison reportée";
      capped++;
      continue;
    }

    const channel = channelForLevel(suggestion.level);
    const modality = modalityForChannel(channel);
    if (!modality) continue; // approval-level items never auto-deliver
    const outcome = await deliverMessage({
      message: `Suggestion JARVIS — ${suggestion.message}`,
      modality,
    });
    if ("error" in outcome) continue; // no capable device: retried next sweep
    suggestion.deliveredAt = now.toISOString();
    suggestion.deliveredTo = outcome.routing.deviceName;
    suggestion.decision = explain(suggestion.level, prefs.proactivity);
    state.deliveryLog.push(now.toISOString());
    budget--;
    delivered++;
  }

  save(state);
  return { generated, delivered, journaled, capped, proactivity: prefs.proactivity };
}
