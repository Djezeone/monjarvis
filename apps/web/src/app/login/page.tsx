"use client";

import { useEffect, useState } from "react";

/**
 * P6 brick 1 — façade login. One secret, one session cookie. When auth is
 * disabled (local-first, no JARVIS_AUTH_SECRET) the page says so and sends
 * you straight to the cockpit.
 */
export default function LoginPage() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/jarvis/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const r = await fetch("/api/jarvis/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (r.ok) {
      window.location.href = "/app";
    } else {
      setError("Secret invalide.");
    }
  }

  return (
    <main className="panel" style={{ maxWidth: 420, margin: "10vh auto" }}>
      <h1>JARVIS X2</h1>
      {enabled === false ? (
        <p className="muted">
          Authentification désactivée (mode local) — <a href="/app">ouvrir le cockpit</a>.
        </p>
      ) : (
        <form onSubmit={submit}>
          <p className="muted">Cette façade est privée. Entrez votre secret.</p>
          <p>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Secret JARVIS"
              aria-label="Secret JARVIS"
              autoFocus
            />
          </p>
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="state-card">
            Entrer
          </button>
        </form>
      )}
    </main>
  );
}
