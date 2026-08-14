"use client";

import { useCallback, useEffect, useState } from "react";

interface LearnedPreference {
  id: string;
  kind: string;
  message: string;
  provenance: string[];
  createdAt: string;
  status: "proposed" | "promoted" | "rejected";
  decidedAt: string | null;
}

/**
 * P5 brick 4 — learned preferences. Every proposal shows its provenance
 * (the concrete observations behind it) and waits for an explicit human
 * decision: Adopter applies it to the preferences, Rejeter buries the exact
 * proposal forever. The sweep itself never changes a preference.
 */
export function LearnedPanel() {
  const [candidates, setCandidates] = useState<LearnedPreference[] | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/learned", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCandidates(d.candidates ?? []))
      .catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function decide(id: string, action: "promote" | "reject") {
    await fetch(`/api/jarvis/learned/${id}/${action}`, { method: "POST" });
    refresh();
  }

  const proposed = (candidates ?? []).filter((c) => c.status === "proposed");
  const decided = (candidates ?? []).filter((c) => c.status !== "proposed").slice(0, 5);

  return (
    <section className="panel">
      <h2>Préférences apprises</h2>
      <p className="muted">
        JARVIS observe vos usages réels et propose — avec ses preuves. Rien
        n&apos;est appliqué sans votre décision : l&apos;inférence propose,
        l&apos;humain dispose.
      </p>
      {candidates === null && <p className="muted">Lecture…</p>}
      {candidates !== null && proposed.length === 0 && (
        <p className="muted">Aucune proposition en attente.</p>
      )}
      {proposed.map((c) => (
        <div key={c.id} className="state-card">
          <p>{c.message}</p>
          <ul className="muted">
            {c.provenance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>
            <button type="button" className="state-card" onClick={() => decide(c.id, "promote")}>
              Adopter
            </button>{" "}
            <button type="button" className="state-card" onClick={() => decide(c.id, "reject")}>
              Rejeter
            </button>
          </p>
        </div>
      ))}
      {decided.length > 0 && (
        <p className="muted">
          Décisions récentes :{" "}
          {decided
            .map((c) => `${c.status === "promoted" ? "adoptée" : "rejetée"} — ${c.message}`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
