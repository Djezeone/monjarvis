"use client";

import { useCallback, useEffect, useState } from "react";

interface Suggestion {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  deliveredAt: string | null;
  deliveredTo: string | null;
  dismissedAt: string | null;
}

/**
 * P5 brick 3 — proactive suggestions, capped by the proactivity preference
 * (off = none, low = 1/h, normal = 4/h). Each row shows exactly what
 * happened: delivered where, pending under cap, or dismissed.
 */
export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/suggestions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function dismiss(id: string) {
    await fetch(`/api/jarvis/suggestions/${id}/dismiss`, { method: "POST" });
    refresh();
  }

  const active = (suggestions ?? []).filter((s) => !s.dismissedAt);

  return (
    <section className="panel">
      <h2>Suggestions</h2>
      <p className="muted">
        Signaux réels observés par JARVIS (satellite silencieux, commande
        échouée), livrés en notification sous plafond de proactivité — jamais
        de spam, jamais de voix non sollicitée.
      </p>
      {suggestions === null && <p className="muted">Lecture…</p>}
      {suggestions !== null && active.length === 0 && (
        <p className="muted">Rien à signaler.</p>
      )}
      {active.length > 0 && (
        <table>
          <tbody>
            {active.map((s) => (
              <tr key={s.id}>
                <td>{s.message}</td>
                <td className="muted">
                  {s.deliveredAt
                    ? `livrée à ${s.deliveredTo}`
                    : "en attente (plafond ou aucun appareil)"}
                </td>
                <td>
                  <button type="button" className="state-card" onClick={() => dismiss(s.id)}>
                    Ignorer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
