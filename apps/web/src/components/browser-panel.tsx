"use client";

import { useCallback, useEffect, useState } from "react";

interface Domain {
  id: string;
  domain: string;
}

interface Execution {
  id: string;
  at: string;
  task: string;
  domains: string[];
  steps: number;
  ok: boolean;
  detail: string;
}

interface BrowserState {
  config: { enabled: boolean; configured: boolean; missing: string[] };
  stepCeiling: number;
  domains: Domain[];
  executions: Execution[];
}

/**
 * P8 brick 3 — browser worker: off by default, allowlisted by domain,
 * every task approved. The panel states the three guards rather than
 * hiding them behind a "Run" button.
 */
export function BrowserPanel() {
  const [state, setState] = useState<BrowserState | null>(null);
  const [domain, setDomain] = useState("");
  const [task, setTask] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/browser", { cache: "no-store" })
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function declare(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/jarvis/browser/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const d = await r.json();
    setNote(r.ok ? `« ${d.domain} » déclaré.` : `Refusé : ${d.error}`);
    if (r.ok) setDomain("");
    refresh();
  }

  async function run(approvedBy?: string) {
    const domains = (state?.domains ?? []).map((d) => d.domain);
    const r = await fetch("/api/jarvis/browser/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, domains, approvedBy }),
    });
    const d = await r.json();
    if (r.status === 428) {
      if (window.confirm(`${d.error}\n\nLancer « ${task} » malgré tout ?`)) {
        return run("operator");
      }
      setNote("Tâche annulée.");
      return;
    }
    setNote(r.ok ? `Tâche lancée (${d.steps} pas maximum).` : `Échec : ${d.error}`);
    refresh();
  }

  return (
    <section className="panel" data-testid="browser-panel">
      <h2>Navigateur agentique</h2>
      {state === null && <p className="muted">Lecture…</p>}
      {state !== null && (
        <>
          <p className="muted">
            Éteint par défaut. Un navigateur porte vos sessions connectées :
            chaque tâche est plafonnée à {state.stepCeiling} pas, limitée aux
            domaines déclarés, et demande votre accord — il n&apos;existe
            volontairement aucun niveau « lecture seule ».
          </p>
          {state.config.missing.length > 0 && (
            <ul className="muted" data-testid="browser-missing">
              {state.config.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <form onSubmit={declare}>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="exemple.fr"
              aria-label="Domaine autorisé"
            />{" "}
            <button type="submit" className="state-card">
              Déclarer le domaine
            </button>
          </form>

          {state.domains.length > 0 && (
            <p className="muted" data-testid="browser-domains">
              Domaines autorisés : {state.domains.map((d) => d.domain).join(", ")}
            </p>
          )}

          <p>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Tâche à confier au navigateur…"
              aria-label="Tâche navigateur"
            />{" "}
            <button
              type="button"
              className="state-card"
              disabled={!state.config.enabled || !state.config.configured || !task.trim()}
              onClick={() => run()}
            >
              Lancer
            </button>
          </p>

          {state.executions.length > 0 && (
            <table>
              <tbody>
                {state.executions.map((x) => (
                  <tr key={x.id}>
                    <td>{x.task}</td>
                    <td className="muted">{x.domains.join(", ")}</td>
                    <td className="muted">{x.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {note && <p role="status">{note}</p>}
        </>
      )}
    </section>
  );
}
