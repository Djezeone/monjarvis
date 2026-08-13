"use client";

import { useJarvisRuntime } from "@/jarvis/runtime/JarvisRuntimeProvider";

/**
 * Explicit opt-in control for the local voice runtime — connection is a user
 * decision, never automatic (P2 contract).
 */
export function RuntimeConnect() {
  const { connected, connecting, connect, disconnect } = useJarvisRuntime();

  return (
    <section className="panel">
      <h2>Runtime vocal local</h2>
      <p className="muted">
        Le runtime hands-free (wake word, port 8765) ne se connecte que sur
        décision explicite. Démarrage : <code>services/voice-runtime</code>.
      </p>
      <button
        type="button"
        className="state-card"
        onClick={() => (connected ? disconnect() : connect())}
        disabled={connecting}
        aria-pressed={connected}
      >
        {connecting
          ? "Connexion…"
          : connected
            ? "Déconnecter le runtime"
            : "Connecter le runtime local"}
      </button>{" "}
      <span className={`badge ${connected ? "ok" : "off"}`}>
        {connected ? "connecté" : "déconnecté"}
      </span>
    </section>
  );
}
