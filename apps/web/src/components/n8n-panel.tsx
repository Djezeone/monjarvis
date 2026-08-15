"use client";

import { useCallback, useEffect, useState } from "react";

interface Workflow {
  id: string;
  name: string;
  path: string;
  description: string;
  tier: "ACT" | "CRITICAL";
  policyReason: string;
  lastRunAt: string | null;
  lastOutcome: string | null;
}

interface N8nState {
  config: { canTrigger: boolean; canProbe: boolean; authenticated: boolean; missing: string[] };
  health: "connected" | "unreachable" | "not_configured";
  workflows: Workflow[];
}

/**
 * P8 brick 1 — n8n: the allowlist of workflows JARVIS may trigger. What is
 * missing to plug the service in is spelled out, CRITICAL workflows ask
 * before running, and every run reports what really happened.
 */
export function N8nPanel() {
  const [state, setState] = useState<N8nState | null>(null);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/jarvis/n8n", { cache: "no-store" })
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function declare(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/jarvis/n8n/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, path }),
    });
    const d = await r.json();
    setNote(r.ok ? `Workflow « ${d.name} » déclaré (${d.tier}).` : `Refusé : ${d.error}`);
    if (r.ok) {
      setName("");
      setPath("");
    }
    refresh();
  }

  async function run(workflow: Workflow) {
    const body: Record<string, unknown> = { input: { source: "cockpit" } };
    if (workflow.tier === "CRITICAL") {
      if (
        !window.confirm(
          `${workflow.policyReason}\n\nExécuter « ${workflow.name} » malgré tout ?`
        )
      ) {
        return;
      }
      body.approvedBy = "operator";
    }
    const r = await fetch(`/api/jarvis/n8n/workflows/${workflow.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setNote(r.ok ? `« ${workflow.name} » exécuté.` : `Échec : ${d.error}`);
    refresh();
  }

  return (
    <section className="panel" data-testid="n8n-panel">
      <h2>Workflows n8n</h2>
      {state === null && <p className="muted">Lecture…</p>}
      {state !== null && (
        <>
          <p className="muted">
            Allowlist : JARVIS ne déclenche que des workflows déclarés ici.
            Instance : <strong data-testid="n8n-health">{state.health}</strong>.
          </p>
          {state.config.missing.length > 0 && (
            <ul className="muted" data-testid="n8n-missing">
              {state.config.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <form onSubmit={declare}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du workflow"
              aria-label="Nom du workflow"
            />{" "}
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="chemin-webhook"
              aria-label="Chemin webhook"
            />{" "}
            <button type="submit" className="state-card">
              Déclarer
            </button>
          </form>

          {state.workflows.length === 0 ? (
            <p className="muted">Aucun workflow déclaré.</p>
          ) : (
            <table>
              <tbody>
                {state.workflows.map((w) => (
                  <tr key={w.id} data-tier={w.tier}>
                    <td>{w.name}</td>
                    <td className="muted">{w.tier}</td>
                    <td className="muted">{w.lastOutcome ?? "jamais exécuté"}</td>
                    <td>
                      <button
                        type="button"
                        className="state-card"
                        disabled={!state.config.canTrigger}
                        onClick={() => run(w)}
                      >
                        Exécuter
                      </button>
                    </td>
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
