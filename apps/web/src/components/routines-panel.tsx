"use client";

import { useCallback, useEffect, useState } from "react";

interface Routine {
  id: string;
  name: string;
  prompt: string;
  schedule: { kind: "daily"; time: string } | { kind: "interval"; minutes: number };
  modality: "voice" | "notification";
  enabled: boolean;
  lastRunAt: string | null;
  lastOutcome: string | null;
}

/**
 * P5 brick 2 — Routines: scheduled Core runs whose results arrive through
 * the Presence Bus. Proactivity=off pauses every execution; quiet hours
 * downgrade voice to notification (both preference-driven, both honest —
 * the outcome column shows exactly what happened).
 */
export function RoutinesPanel() {
  const [routines, setRoutines] = useState<Routine[] | null>(null);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"daily" | "interval">("daily");
  const [time, setTime] = useState("08:00");
  const [minutes, setMinutes] = useState(60);
  const [modality, setModality] = useState<"voice" | "notification">("notification");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(() => {
    fetch("/api/jarvis/routines", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRoutines(d.routines ?? []))
      .catch(() => setRoutines([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function create() {
    setNotice("");
    const r = await fetch("/api/jarvis/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        prompt,
        modality,
        schedule: kind === "daily" ? { kind, time } : { kind, minutes },
      }),
    });
    if (r.ok) {
      setName("");
      setPrompt("");
      refresh();
    } else {
      setNotice(`Création impossible (${(await r.json()).error ?? r.status})`);
    }
  }

  async function runNow(id: string) {
    setNotice("Exécution en cours…");
    const r = await fetch(`/api/jarvis/routines/${id}/run`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setNotice(r.ok ? `Résultat : ${d.outcome}` : `Échec (${r.status})`);
    refresh();
  }

  async function toggle(routine: Routine) {
    await fetch(`/api/jarvis/routines/${routine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !routine.enabled }),
    });
    refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/jarvis/routines/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <section className="panel">
      <h2>Routines</h2>
      <p className="muted">
        Tâches planifiées côté Core : chaque exécution est un vrai run, livré
        via le Presence Bus. Proactivité « off » met tout en pause ; les
        heures calmes remplacent la voix par une notification.
      </p>
      <p>
        <input
          aria-label="Nom de la routine"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size={16}
        />{" "}
        <input
          aria-label="Prompt de la routine"
          placeholder="Prompt envoyé au Core"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          size={34}
        />{" "}
        <select aria-label="Type de planification" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="daily">chaque jour à</option>
          <option value="interval">toutes les N minutes</option>
        </select>{" "}
        {kind === "daily" ? (
          <input type="time" aria-label="Heure quotidienne" value={time} onChange={(e) => setTime(e.target.value)} />
        ) : (
          <input
            type="number"
            aria-label="Intervalle en minutes"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            style={{ width: "5rem" }}
          />
        )}{" "}
        <select aria-label="Modalité de livraison" value={modality} onChange={(e) => setModality(e.target.value as typeof modality)}>
          <option value="notification">notification</option>
          <option value="voice">voix</option>
        </select>{" "}
        <button type="button" className="state-card" onClick={create} disabled={!name.trim() || !prompt.trim()}>
          Créer
        </button>
      </p>
      {routines === null && <p className="muted">Lecture des routines…</p>}
      {routines && routines.length === 0 && (
        <p className="muted">Aucune routine. Exemple : « Brief du matin » chaque jour à 07:45.</p>
      )}
      {routines && routines.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Routine</th>
              <th>Planification</th>
              <th>Dernier résultat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {routines.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}{" "}
                  <span className={`badge ${r.enabled ? "ok" : "off"}`}>
                    {r.enabled ? "active" : "en pause"}
                  </span>
                </td>
                <td className="muted">
                  {r.schedule.kind === "daily"
                    ? `chaque jour à ${r.schedule.time}`
                    : `toutes les ${r.schedule.minutes} min`}{" "}
                  · {r.modality}
                </td>
                <td className="muted">{r.lastOutcome ?? "—"}</td>
                <td>
                  <button type="button" className="state-card" onClick={() => runNow(r.id)}>
                    Exécuter
                  </button>{" "}
                  <button type="button" className="state-card" onClick={() => toggle(r)}>
                    {r.enabled ? "Pause" : "Activer"}
                  </button>{" "}
                  <button type="button" className="state-card" onClick={() => remove(r.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {notice && <p className="muted" data-routine-notice>{notice}</p>}
    </section>
  );
}
