"use client";

import { useCallback, useEffect, useState } from "react";

interface Impact {
  windowDays: number;
  conversation: { runs: number; sessions: number; autonomous: number };
  actions: {
    executed: number;
    failed: number;
    refused: number;
    criticalApproved: number;
    inFlight: number;
  };
  presence: { devices: number; online: number; revoked: number };
  proactivity: { raised: number; delivered: number; dismissed: number };
  learning: {
    preferences: { proposed: number; accepted: number; refused: number };
    skills: { proposed: number; accepted: number; refused: number; executed: number };
  };
  routines: { total: number; enabled: number; everRun: number };
  automations: { declared: number; executed: number; failed: number };
  home: { declared: number; executed: number; failed: number; approved: number };
  notMeasured: string[];
}

/**
 * P7 brick 1 — Impact: what JARVIS really did over a window, read straight
 * from the registries that drive its behaviour. Failures and refusals sit
 * next to successes, and the metrics the system cannot honestly observe
 * are named rather than invented.
 */
export function ImpactPanel() {
  const [days, setDays] = useState(30);
  const [impact, setImpact] = useState<Impact | null>(null);

  const refresh = useCallback((window: number) => {
    fetch(`/api/jarvis/impact?days=${window}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setImpact)
      .catch(() => setImpact(null));
  }, []);

  useEffect(() => {
    refresh(days);
  }, [days, refresh]);

  return (
    <section className="panel" data-testid="impact-panel">
      <h2>Impact</h2>
      <p className="muted">
        Ce que JARVIS a réellement fait — compté sur les registres eux-mêmes,
        échecs et refus compris.
      </p>
      <p>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            className="state-card"
            aria-pressed={days === d}
            onClick={() => setDays(d)}
          >
            {d} jours
          </button>
        ))}
      </p>
      {impact === null && <p className="muted">Lecture…</p>}
      {impact !== null && (
        <>
          <table>
            <tbody>
              <tr>
                <td>Runs du Core</td>
                <td data-testid="impact-runs">{impact.conversation.runs}</td>
                <td className="muted">
                  dont {impact.conversation.autonomous} lancés par JARVIS lui-même
                </td>
              </tr>
              <tr>
                <td>Actions exécutées sur vos appareils</td>
                <td data-testid="impact-executed">{impact.actions.executed}</td>
                <td className="muted">
                  {impact.actions.failed} échec(s), {impact.actions.refused} refus,{" "}
                  {impact.actions.inFlight} en cours
                </td>
              </tr>
              <tr>
                <td>Actions CRITICAL passées par votre approbation</td>
                <td>{impact.actions.criticalApproved}</td>
                <td className="muted">jamais exécutées sans vous (FR-009)</td>
              </tr>
              <tr>
                <td>Suggestions proactives</td>
                <td>{impact.proactivity.delivered}</td>
                <td className="muted">
                  livrées sur {impact.proactivity.raised} levées,{" "}
                  {impact.proactivity.dismissed} ignorée(s)
                </td>
              </tr>
              <tr>
                <td>Préférences apprises adoptées</td>
                <td>{impact.learning.preferences.accepted}</td>
                <td className="muted">
                  sur {impact.learning.preferences.proposed} proposée(s),{" "}
                  {impact.learning.preferences.refused} rejetée(s)
                </td>
              </tr>
              <tr>
                <td>Skills approuvés</td>
                <td>{impact.learning.skills.accepted}</td>
                <td className="muted">
                  sur {impact.learning.skills.proposed} proposé(s),{" "}
                  {impact.learning.skills.executed} déjà lancé(s)
                </td>
              </tr>
              <tr>
                <td>Routines</td>
                <td>{impact.routines.enabled}</td>
                <td className="muted">
                  actives sur {impact.routines.total}, {impact.routines.everRun} déjà
                  exécutée(s)
                </td>
              </tr>
              <tr>
                <td>Workflows n8n exécutés</td>
                <td>{impact.automations.executed}</td>
                <td className="muted">
                  sur {impact.automations.declared} déclaré(s),{" "}
                  {impact.automations.failed} échec(s)
                </td>
              </tr>
              <tr>
                <td>Actions sur la maison</td>
                <td>{impact.home.executed}</td>
                <td className="muted">
                  sur {impact.home.declared} entité(s) déclarée(s),{" "}
                  {impact.home.approved} après votre accord, {impact.home.failed} échec(s)
                </td>
              </tr>
              <tr>
                <td>Présence</td>
                <td>{impact.presence.online}</td>
                <td className="muted">
                  appareil(s) en ligne sur {impact.presence.devices} enrôlé(s),{" "}
                  {impact.presence.revoked} révoqué(s)
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted" data-testid="impact-not-measured">
            Non mesuré, et donc non affiché : {impact.notMeasured.join(" · ")}.
          </p>
        </>
      )}
    </section>
  );
}
