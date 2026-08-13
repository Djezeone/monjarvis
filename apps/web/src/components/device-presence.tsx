"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionApproval } from "@/jarvis/components/approvals/ActionApproval";
import type { ActionRequest } from "@/jarvis/runtime/contracts";

interface DeviceRow {
  id: string;
  name: string;
  kind: string;
  capabilities: string[];
  online: boolean;
  revoked: boolean;
  lastSeenAt: string | null;
}

interface PendingDispatch {
  action: ActionRequest;
  deviceId: string;
  capability: string;
  args: Record<string, unknown>;
}

/**
 * P4 Presence panel — real heartbeat-derived state from the Device Registry.
 * Dispatching a CRITICAL capability opens the P2 ActionApproval gate
 * (FR-009): target, reversibility and affected data are shown before the
 * operator approves once or denies. An empty list means no satellite has
 * enrolled yet; nothing is invented.
 */
export function DevicePresence() {
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [notice, setNotice] = useState("");
  const [enrollment, setEnrollment] = useState<{ code: string; expiresAt: string } | null>(
    null
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingDispatch | null>(null);

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
    setNotice(
      r.ok
        ? `Appareil ${id} révoqué — son token est invalidé.`
        : `Révocation impossible (${r.status})`
    );
    refresh();
  }

  async function sendDispatch(
    deviceId: string,
    capability: string,
    args: Record<string, unknown>,
    approvedBy?: string
  ) {
    const r = await fetch("/api/jarvis/devices/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, capability, args, approvedBy }),
    });
    const d = await r.json().catch(() => ({}));
    return { status: r.status, ok: r.ok, data: d };
  }

  async function dispatch(device: DeviceRow) {
    setNotice("");
    const capability = selected[device.id] || device.capabilities[0];
    if (!capability) return;
    const args: Record<string, unknown> =
      capability === "notify"
        ? { title: "JARVIS", message: "Test de notification depuis le cockpit." }
        : {};

    const first = await sendDispatch(device.id, capability, args);
    if (first.status === 428) {
      // CRITICAL: open the approval gate — the dispatch is NOT queued yet.
      setPending({
        deviceId: device.id,
        capability,
        args,
        action: {
          id: crypto.randomUUID(),
          title: `Exécuter ${capability} sur « ${device.name} »`,
          description: String(first.data.error || "Capability critique : approbation explicite requise."),
          tier: "CRITICAL",
          reversible: false,
          target: `${device.name} (${device.id})`,
          dataAffected: [capability],
          requestedBy: "cockpit",
          createdAt: new Date().toISOString(),
        },
      });
      return;
    }
    setNotice(
      first.ok
        ? `${capability} mis en file pour ${device.id} (commande ${String(first.data.id).slice(0, 8)}…, tier ${first.data.policy?.tier})`
        : `Dispatch refusé : ${first.data.error ?? first.status}`
    );
  }

  async function approvePending() {
    if (!pending) return;
    const { deviceId, capability, args } = pending;
    setPending(null);
    const r = await sendDispatch(deviceId, capability, args, "operator-cockpit");
    setNotice(
      r.ok
        ? `Approuvé : ${capability} mis en file pour ${deviceId} (commande ${String(r.data.id).slice(0, 8)}…)`
        : `Dispatch approuvé mais refusé par le Core : ${r.data.error ?? r.status}`
    );
  }

  function denyPending() {
    if (!pending) return;
    setNotice(`Refusé : ${pending.capability} sur ${pending.deviceId} n'a pas été mis en file.`);
    setPending(null);
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
              <th>État</th>
              <th>Dispatch</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td className="muted">{d.kind}</td>
                <td>
                  <span
                    className={`badge ${d.revoked ? "missing" : d.online ? "ok" : "off"}`}
                  >
                    {d.revoked ? "révoqué" : d.online ? "en ligne" : "hors ligne"}
                  </span>
                </td>
                <td>
                  {d.online && !d.revoked && d.capabilities.length > 0 ? (
                    <>
                      <select
                        aria-label={`Capability pour ${d.name}`}
                        value={selected[d.id] || d.capabilities[0]}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [d.id]: e.target.value }))
                        }
                      >
                        {d.capabilities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>{" "}
                      <button
                        type="button"
                        className="state-card"
                        onClick={() => dispatch(d)}
                      >
                        Envoyer
                      </button>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
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
      {pending && (
        <ActionApproval
          action={pending.action}
          onApprove={approvePending}
          onDeny={denyPending}
        />
      )}
    </section>
  );
}
