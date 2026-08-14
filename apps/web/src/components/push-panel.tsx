"use client";

import { useCallback, useEffect, useState } from "react";

interface PushStatus {
  configured: boolean;
  publicKey: string;
  subscriptions: number;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * P6 brick 5 — push notifications: subscribe THIS browser so JARVIS
 * reaches it even with the app closed. States are reported honestly:
 * keys missing, permission denied, subscribed here or not.
 */
export function PushPanel() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s: PushStatus = await (
        await fetch("/api/jarvis/push/key", { cache: "no-store" })
      ).json();
      setStatus(s);
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const sub = await registration?.pushManager.getSubscription();
        setSubscribedHere(Boolean(sub));
      }
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setNote(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNote("Permission refusée par le navigateur.");
        return;
      }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(status!.publicKey).buffer as ArrayBuffer,
      });
      await fetch("/api/jarvis/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setNote("Cet appareil recevra les notifications JARVIS, même app fermée.");
    } catch (e) {
      setNote(`Échec de l'abonnement: ${e instanceof Error ? e.message : e}`);
    }
    await refresh();
  }

  async function disable() {
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/jarvis/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setNote("Abonnement retiré pour cet appareil.");
    await refresh();
  }

  return (
    <section className="panel">
      <h2>Notifications push</h2>
      {status === null && <p className="muted">Lecture…</p>}
      {status !== null && !status.configured && (
        <p className="muted">
          Clés VAPID absentes côté Core — générez-les avec « npm run vapid »
          puis renseignez les variables d&apos;environnement.
        </p>
      )}
      {status !== null && status.configured && (
        <>
          <p className="muted">
            {status.subscriptions} navigateur(s) abonné(s). Les notifications du
            Presence Bus sont aussi poussées ici, même app fermée ; sans
            satellite capable en ligne, le push devient le canal de repli.
          </p>
          {subscribedHere ? (
            <button type="button" className="state-card" onClick={disable}>
              Désactiver sur cet appareil
            </button>
          ) : (
            <button type="button" className="state-card" onClick={enable}>
              Activer sur cet appareil
            </button>
          )}{" "}
          <button
            type="button"
            className="state-card"
            onClick={async () => {
              const r = await fetch("/api/jarvis/push/test", { method: "POST" });
              const d = await r.json();
              setNote(
                r.ok
                  ? `Test envoyé à ${d.sent} abonnement(s).`
                  : `Test impossible: ${d.error}`
              );
            }}
          >
            Envoyer un test
          </button>
        </>
      )}
      {note && <p role="status">{note}</p>}
    </section>
  );
}
