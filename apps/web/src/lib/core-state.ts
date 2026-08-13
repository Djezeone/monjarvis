/**
 * The eight Core presence states (PRD FR-001) and their legal transitions.
 * Presentation state never grants execution authority (security invariant):
 * this module drives UI presence only — actions go through the (future)
 * Policy Engine server-side.
 */

export const CORE_STATES = [
  "idle",
  "wake",
  "listening",
  "understanding",
  "thinking",
  "acting",
  "speaking",
  "warning",
] as const;

export type CoreState = (typeof CORE_STATES)[number];

const TRANSITIONS: Record<CoreState, readonly CoreState[]> = {
  idle: ["wake", "listening", "warning"],
  wake: ["listening", "idle", "warning"],
  listening: ["understanding", "idle", "warning"],
  understanding: ["thinking", "idle", "warning"],
  thinking: ["acting", "speaking", "idle", "warning"],
  acting: ["speaking", "thinking", "idle", "warning"],
  speaking: ["idle", "listening", "warning"],
  warning: ["idle"],
};

export function canTransition(from: CoreState, to: CoreState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transition(from: CoreState, to: CoreState): CoreState {
  return canTransition(from, to) ? to : from;
}

export const CORE_STATE_LABELS: Record<CoreState, string> = {
  idle: "Idle — présence calme",
  wake: "Wake — mot d'éveil détecté",
  listening: "Listening — écoute active",
  understanding: "Understanding — transcription/analyse",
  thinking: "Thinking — raisonnement du Core",
  acting: "Acting — exécution sous politique",
  speaking: "Speaking — restitution vocale",
  warning: "Warning — attention requise",
};
