"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listPending,
  queueRun,
  removePending,
  type PendingRun,
} from "@/lib/pending-queue";

interface FacadeStatus {
  role: "facade" | "core";
  coreConfigured: boolean;
  coreReachable: boolean;
}

/**
 * P6 brick 3 — honest "Core offline" degradation. On a façade whose brain
 * is unreachable, the cockpit says so plainly and lets you leave
 * instructions in a local queue (your device — the façade stores nothing).
 * The moment the Core answers again, each queued instruction is replayed
 * as a REAL run, in order, and reported honestly.
 */
export function CoreStatus() {
  const [status, setStatus] = useState<FacadeStatus | null>(null);
  const [pending, setPending] = useState<PendingRun[]>([]);
  const [replayed, setReplayed] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const replaying = useRef(false);

  const refreshPending = useCallback(() => {
    setPending(listPending(window.localStorage));
  }, []);

  const replay = useCallback(async () => {
    if (replaying.current) return;
    replaying.current = true;
    try {
      for (const entry of listPending(window.localStorage)) {
        const r = await fetch("/api/jarvis/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: entry.input, device: "reprise-façade" }),
        });
        if (!r.ok) break; // the Core flapped — keep the rest for next recovery
        const run = await r.json();
        removePending(window.localStorage, entry.id);
        setReplayed((list) => [...list, `« ${entry.input} » rejouée (run ${run.runId})`]);
      }
    } finally {
      replaying.current = false;
      setPending(listPending(window.localStorage));
    }
  }, []);

  useEffect(() => {
    refreshPending();
    let stop = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/jarvis/facade/status", { cache: "no-store" });
        const s: FacadeStatus = await r.json();
        if (stop) return;
        setStatus(s);
        if (s.role === "facade" && s.coreReachable && listPending(window.localStorage).length) {
          void replay();
        }
      } catch {
        if (!stop) setStatus(null);
      }
    };
    void poll();
    const t = setInterval(poll, 10_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [refreshPending, replay]);

  // Core role, or façade with a healthy brain and nothing queued: stay out
  // of the way (replay reports remain visible until dismissed by reload).
  if (!status || status.role === "core") return null;
  const offline = !status.coreConfigured || !status.coreReachable;
  if (!offline && pending.length === 0 && replayed.length === 0) return null;

  function keep(e: React.FormEvent) {
    e.preventDefault();
    setPending(
      queueRun(window.localStorage, draft, crypto.randomUUID(), new Date().toISOString())
    );
    setDraft("");
  }

  return (
    <section className="panel" role="alert" data-testid="core-status">
      {offline ? (
        <>
          <h2>JARVIS Core hors ligne</h2>
          <p className="muted">
            {status.coreConfigured
              ? "Le cerveau ne répond pas. L'interface reste disponible ; vos instructions sont gardées ici, sur cet appareil, et seront rejouées dès son retour."
              : "Aucun cerveau configuré (JARVIS_CORE_URL). L'interface reste consultable."}
          </p>
          {status.coreConfigured && (
            <form onSubmit={keep}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Instruction pour le retour du Core…"
                aria-label="Instruction en attente"
              />{" "}
              <button type="submit" className="state-card">
                Garder pour le retour
              </button>
            </form>
          )}
        </>
      ) : (
        <h2>JARVIS Core de retour</h2>
      )}
      {pending.length > 0 && (
        <ul data-testid="pending-list">
          {pending.map((p) => (
            <li key={p.id}>
              {p.input} <span className="muted">(en attente)</span>
            </li>
          ))}
        </ul>
      )}
      {replayed.length > 0 && (
        <ul data-testid="replayed-list">
          {replayed.map((line) => (
            <li key={line} className="muted">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
