"use client";

import { useEffect, useState } from "react";
import type { OrganHealth } from "@/app/api/jarvis/health/route";

const STATUS_LABEL: Record<OrganHealth["status"], { text: string; cls: string }> = {
  connected: { text: "connecté", cls: "ok" },
  unreachable: { text: "configuré, injoignable", cls: "missing" },
  configured_unverified: { text: "configuré (non vérifié)", cls: "missing" },
  not_configured: { text: "non configuré", cls: "off" },
};

/**
 * Live organ availability from /api/jarvis/health — real server-side checks,
 * nothing simulated (NFR-004: every organ can be down without breaking /app).
 */
export function OrganStatus() {
  const [organs, setOrgans] = useState<OrganHealth[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/jarvis/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setOrgans(d.organs ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel">
      <h2>Organes</h2>
      {failed && (
        <p className="muted">Impossible d&apos;interroger /api/jarvis/health.</p>
      )}
      {!organs && !failed && <p className="muted">Vérification en cours…</p>}
      {organs && (
        <table>
          <thead>
            <tr>
              <th>Organe</th>
              <th>Rôle</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {organs.map((o) => (
              <tr key={o.name}>
                <td>{o.name}</td>
                <td className="muted">{o.role}</td>
                <td>
                  <span className={`badge ${STATUS_LABEL[o.status].cls}`}>
                    {STATUS_LABEL[o.status].text}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">
        États vérifiés côté serveur (endpoints /health réels ; présence de
        configuration sinon). Démarrage des services :
        <code>services/local-stack</code>, <code>services/voice-runtime</code>,
        <code>docs/operations/LOCAL_FIRST_DEPLOYMENT.md</code>.
      </p>
    </section>
  );
}
