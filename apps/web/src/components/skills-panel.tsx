"use client";

import { useCallback, useEffect, useState } from "react";

interface Skill {
  id: string;
  name: string;
  prompt: string;
  message: string;
  provenance: string[];
  createdAt: string;
  status: "proposed" | "approved" | "rejected";
  lastRunAt: string | null;
  lastOutcome: string | null;
}

/**
 * P5 brick 5 — skill learning behind approval (FR-009). Repeated procedures
 * are proposed with their evidence; only after an explicit approval does a
 * skill become invocable — a real Core run, outcome shown honestly.
 */
export function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/skills", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSkills(d.skills ?? []))
      .catch(() => setSkills([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function decide(id: string, action: "approve" | "reject") {
    await fetch(`/api/jarvis/skills/${id}/${action}`, { method: "POST" });
    refresh();
  }

  async function run(id: string) {
    setRunning(id);
    try {
      await fetch(`/api/jarvis/skills/${id}/run`, { method: "POST" });
    } finally {
      setRunning(null);
      refresh();
    }
  }

  const proposed = (skills ?? []).filter((s) => s.status === "proposed");
  const approved = (skills ?? []).filter((s) => s.status === "approved");

  return (
    <section className="panel">
      <h2>Skills appris</h2>
      <p className="muted">
        Les procédures que vous répétez vraiment deviennent des skills
        nommés — proposés avec leurs preuves, invocables seulement après
        votre approbation (FR-009).
      </p>
      {skills === null && <p className="muted">Lecture…</p>}
      {skills !== null && proposed.length === 0 && approved.length === 0 && (
        <p className="muted">Aucun skill pour l&apos;instant.</p>
      )}
      {proposed.map((s) => (
        <div key={s.id} className="state-card">
          <p>
            {s.message} <strong>« {s.name} »</strong>
          </p>
          <ul className="muted">
            {s.provenance.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>
            <button type="button" className="state-card" onClick={() => decide(s.id, "approve")}>
              Approuver
            </button>{" "}
            <button type="button" className="state-card" onClick={() => decide(s.id, "reject")}>
              Rejeter
            </button>
          </p>
        </div>
      ))}
      {approved.map((s) => (
        <div key={s.id} className="state-card">
          <p>
            <strong>{s.name}</strong>
          </p>
          <p className="muted">
            {s.lastRunAt ? `dernier run: ${s.lastOutcome}` : "jamais lancé"}
          </p>
          <button
            type="button"
            className="state-card"
            disabled={running === s.id}
            onClick={() => run(s.id)}
          >
            {running === s.id ? "En cours…" : "Lancer"}
          </button>
        </div>
      ))}
    </section>
  );
}
