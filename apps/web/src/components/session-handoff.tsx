"use client";

import { useEffect, useState } from "react";

interface SessionRow {
  sessionKey: string;
  title: string;
  updatedAt: string;
  lastDevice: string;
  activity: Array<{ device: string; at: string; input: string }>;
}

/**
 * P4 session handoff — recent conversations with their device trail.
 * « Reprendre ici » opens the intelligence lab bound to the same sessionKey:
 * the conversation continues, whatever device it started on.
 */
export function SessionHandoff() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      fetch("/api/jarvis/sessions", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setSessions(d.sessions ?? []);
        })
        .catch(() => {
          if (!cancelled) setSessions([]);
        });
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <section className="panel">
      <h2>Sessions — reprendre où vous étiez</h2>
      {sessions === null && <p className="muted">Lecture du registre de sessions…</p>}
      {sessions && sessions.length === 0 && (
        <p className="muted">
          Aucune session encore. Lancez un run depuis{" "}
          <code>/lab/intelligence</code> (ou n&apos;importe quel appareil) — il
          apparaîtra ici, reprenable partout.
        </p>
      )}
      {sessions && sessions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Conversation</th>
              <th>Dernier appareil</th>
              <th>Dernière activité</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.sessionKey}>
                <td>{s.title}</td>
                <td className="muted">{s.lastDevice}</td>
                <td className="muted">{new Date(s.updatedAt).toLocaleTimeString()}</td>
                <td>
                  <a
                    className="state-card"
                    href={`/lab/intelligence?session=${encodeURIComponent(s.sessionKey)}`}
                  >
                    Reprendre ici
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
