"use client";

import { useCallback, useEffect, useState } from "react";

interface DeviceRow {
  id: string;
  name: string;
  kind: string;
  capabilities: string[];
  online: boolean;
  revoked: boolean;
  lastSeenAt: string | null;
}

/**
 * P4 Presence panel — real heartbeat-derived state from the Device Registry.
 * An empty list means no satellite has enrolled yet; nothing is invented.
 */
export function DevicePresence() {
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [notice, setNotice] = useState("");
  const [enrollment, setEnrollment] = useState<{ code: string; expiresAt: string } | null>(
    null
  );

  const refresh = useCallback(() => {
    fetch("/api/jarvis/devices", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => setDevices([]));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function enroll() {
    setNotice("");
    const r = await fetch("/api/jarvis/devices/enroll", { method: "POST" });
    if (r.ok) setEnrollment(await r.json());
    else setNotice(`Enrôlement impossible (${r.status})`);
  }

  async function revoke(id: string) {
    setNotice("");
    const r = await fetch(`/api/jarvis/devices/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
    });
    setNotice(r.ok ? `Appareil ${id} révoqué — son token est invalidé.` : `Révocation impossible (${r.status})`);
    refresh();
  }

  async function ping(id: string) {
    setNotice("");
    const r = await fetch("/api/jarvis/devices/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: id, capability: "presence.ping", args: {} }),
    });
    const d = await r.json().catch(() => ({}));
    setNotice(
      r.ok
        ? `Ping mis en file pour ${id} (commande ${String(d.id).slice(0, 8)}…)`
        : `Dispatch refusé : ${d.error ?? r.status}`
    );
  }

  return (
    <section className="panel">
      <h2>Présence — satellites</h2>
      <p>
        <button type="button" className="state-card" onClick={enroll}>
          Enrôler un appareil
        </button>
      </p>
      {enrollment && (
        <p>
          Code d&apos;enrôlement (usage unique, expire{" "}
          {new Date(enrollment.expiresAt).toLocaleTimeString()}) :{" "}
          <code>{enrollment.code}</code>
          <br />
          <span className="muted">
            À coller dans <code>services/device-agent/config.json</code> →{" "}
            <code>enrollmentCode</code>, puis lancer <code>node agent.mjs</code>.
          </span>
        </p>
      )}
      {devices === null && <p className="muted">Interrogation du registre…</p>}
      {devices && devices.length === 0 && (
        <p className="muted">
          Aucun satellite enrôlé. Installer <code>services/device-agent</code>{" "}
          sur un appareil du mesh privé pour le voir apparaître ici.
        </p>
      )}
      {devices && devices.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Appareil</th>
              <th>Type</th>
              <th>Capabilities</th>
              <th>État</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td className="muted">{d.kind}</td>
                <td className="muted">{d.capabilities.join(", ") || "—"}</td>
                <td>
                  <span
                    className={`badge ${d.revoked ? "missing" : d.online ? "ok" : "off"}`}
                  >
                    {d.revoked ? "révoqué" : d.online ? "en ligne" : "hors ligne"}
                  </span>
                </td>
                <td>
                  {d.online && !d.revoked && d.capabilities.includes("presence.ping") && (
                    <button type="button" className="state-card" onClick={() => ping(d.id)}>
                      Ping
                    </button>
                  )}{" "}
                  {!d.revoked && (
                    <button
                      type="button"
                      className="state-card"
                      onClick={() => revoke(d.id)}
                    >
                      Révoquer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {notice && <p className="muted">{notice}</p>}
    </section>
  );
}
