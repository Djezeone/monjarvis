"use client";

import { useState } from "react";

/**
 * P4 Presence Bus test panel — send a delivery and see WHERE the Core routed
 * it and WHY. A 503 means no capable device is online: shown as-is.
 */
export function OutputRouting() {
  const [message, setMessage] = useState("Test de routage de sortie.");
  const [modality, setModality] = useState<"voice" | "notification">("voice");
  const [result, setResult] = useState("");

  async function deliver() {
    setResult("");
    const r = await fetch("/api/jarvis/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, modality }),
    });
    const d = await r.json().catch(() => ({}));
    setResult(
      r.ok
        ? `Routé vers « ${d.routing.deviceName} » (${d.routing.capability}) — ${d.routing.reason}.`
        : `Livraison impossible : ${d.error ?? r.status}`
    );
  }

  return (
    <section className="panel">
      <h2>Routage de sortie</h2>
      <p className="muted">
        Le Presence Bus choisit l&apos;appareil de réponse : continuité de
        session, puis préférence explicite, appareil au premier plan, enceinte
        du foyer, récence.
      </p>
      <p>
        <input
          aria-label="Message à délivrer"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minWidth: "18rem" }}
        />{" "}
        <select
          aria-label="Modalité"
          value={modality}
          onChange={(e) => setModality(e.target.value as "voice" | "notification")}
        >
          <option value="voice">voix</option>
          <option value="notification">notification</option>
        </select>{" "}
        <button type="button" className="state-card" onClick={deliver}>
          Délivrer
        </button>
      </p>
      {result && <p className="muted" data-routing-result>{result}</p>}
    </section>
  );
}
