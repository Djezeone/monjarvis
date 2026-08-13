"use client";

import { useState } from "react";
import {
  CORE_STATES,
  CORE_STATE_LABELS,
  canTransition,
  transition,
  type CoreState,
} from "@/lib/core-state";

/**
 * Real eight-state machine driving the Core presence indicator.
 * UI-only: presentation state never grants execution authority.
 */
export function CoreStatePanel() {
  const [state, setState] = useState<CoreState>("idle");

  return (
    <section className="panel" aria-live="polite">
      <h2>Core — huit états</h2>
      <div className="core-indicator" data-state={state}>
        {state}
      </div>
      <div className="state-grid">
        {CORE_STATES.map((s) => {
          const reachable = s === state || canTransition(state, s);
          return (
            <button
              key={s}
              type="button"
              className="state-card"
              data-active={s === state}
              data-reachable={reachable}
              onClick={() => setState((cur) => transition(cur, s))}
              aria-pressed={s === state}
              aria-disabled={!reachable}
            >
              <strong>{s}</strong>
              <br />
              <span className="muted">{CORE_STATE_LABELS[s]}</span>
            </button>
          );
        })}
      </div>
      <p className="muted">
        Seules les transitions légales sont actives depuis l&apos;état courant.
        Machine à états validée dans <code>src/lib/core-state.ts</code>.
      </p>
    </section>
  );
}
