"use client";

import { useCallback, useEffect, useState } from "react";

interface Entity {
  id: string;
  entityId: string;
  label: string;
  lastCallAt: string | null;
  lastOutcome: string | null;
}

interface HomeState {
  config: { canRead: boolean; canAct: boolean; missing: string[] };
  health: "connected" | "unreachable" | "not_configured";
  entities: Entity[];
}

/**
 * P8 brick 2 — Home Assistant: the allowlist of entities JARVIS may touch.
 * Declaring an entity is not consenting to every action on it: guarded
 * domains still ask before acting, and the panel says so.
 */
export function HomePanel() {
  const [state, setState] = useState<HomeState | null>(null);
  const [entityId, setEntityId] = useState("");
  const [service, setService] = useState("turn_on");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/home", { cache: "no-store" })
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function declare(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/jarvis/home/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId }),
    });
    const d = await r.json();
    setNote(r.ok ? `« ${d.entityId} » déclarée.` : `Refusé : ${d.error}`);
    if (r.ok) setEntityId("");
    refresh();
  }

  async function call(entity: Entity, approvedBy?: string) {
    const r = await fetch("/api/jarvis/home/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: entity.entityId, service, approvedBy }),
    });
    const d = await r.json();
    if (r.status === 428) {
      // The physical world asked for a human. Ask, then act only if told to.
      if (window.confirm(`${d.error}\n\nConfirmer ${service} sur ${entity.entityId} ?`)) {
        return call(entity, "operator");
      }
      setNote("Action annulée.");
      return;
    }
    setNote(r.ok ? `${service} exécuté sur ${entity.entityId}.` : `Échec : ${d.error}`);
    refresh();
  }

  return (
    <section className="panel" data-testid="home-panel">
      <h2>Maison — Home Assistant</h2>
      {state === null && <p className="muted">Lecture…</p>}
      {state !== null && (
        <>
          <p className="muted">
            JARVIS ne touche que les entités déclarées ici. Instance :{" "}
            <strong data-testid="home-health">{state.health}</strong>. Les domaines
            gardés (serrures, alarmes, volets, chauffage) demandent votre accord à
            chaque action.
          </p>
          {state.config.missing.length > 0 && (
            <ul className="muted" data-testid="home-missing">
              {state.config.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <form onSubmit={declare}>
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="light.salon"
              aria-label="Identifiant d'entité"
            />{" "}
            <button type="submit" className="state-card">
              Déclarer
            </button>
          </form>

          {state.entities.length === 0 ? (
            <p className="muted">Aucune entité déclarée.</p>
          ) : (
            <>
              <p>
                <label>
                  Service{" "}
                  <input
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    aria-label="Service à appeler"
                  />
                </label>
              </p>
              <table>
                <tbody>
                  {state.entities.map((e) => (
                    <tr key={e.id}>
                      <td>{e.entityId}</td>
                      <td className="muted">{e.lastOutcome ?? "jamais appelée"}</td>
                      <td>
                        <button
                          type="button"
                          className="state-card"
                          disabled={!state.config.canAct}
                          onClick={() => call(e)}
                        >
                          Appeler
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {note && <p role="status">{note}</p>}
        </>
      )}
    </section>
  );
}
