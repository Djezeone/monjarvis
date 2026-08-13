"use client";

import { useCallback, useEffect, useState } from "react";

interface DeviceRow {
  id: string;
  name: string;
  kind: string;
  capabilities: string[];
  online: boolean;
  lastSeenAt: string | null;
}

/**
 * P4 Presence panel — real heartbeat-derived state from the Device Registry.
 * An empty list means no satellite has registered yet; nothing is invented.
 */
export function DevicePresence() {
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [notice, setNotice] = useState("");

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
      {devices === null && <p className="muted">Interrogation du registre…</p>}
      {devices && devices.length === 0 && (
        <p className="muted">
          Aucun satellite enregistré. Installer{" "}
          <code>services/device-agent</code> sur un appareil du mesh privé pour
          le voir apparaître ici.
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
                  <span className={`badge ${d.online ? "ok" : "off"}`}>
                    {d.online ? "en ligne" : "hors ligne"}
                  </span>
                </td>
                <td>
                  {d.online && d.capabilities.includes("presence.ping") && (
                    <button type="button" className="state-card" onClick={() => ping(d.id)}>
                      Ping
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
