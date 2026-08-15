"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JarvisApiClient } from "@/jarvis/runtime/intelligence/JarvisApiClient";

/**
 * P7 brick 4 — Talk: the cockpit's front door. The CBOS parcours ends on
 * "Que faisons-nous ?", so the cockpit must answer that question with a
 * real run, not a demo box — same shared entry point as routines, skills
 * and satellites (session bound, preferences injected, activity recorded).
 *
 * When no Core is configured, it says exactly that instead of pretending.
 */
export function TalkPanel() {
  const api = useMemo(() => new JarvisApiClient(), []);
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | undefined>(undefined);
  const poll = useRef<number | undefined>(undefined);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setBusy(true);
    setAnswer("");
    setStatus("JARVIS réfléchit…");
    try {
      const run = await api.start(question, { sessionKey, device: "cockpit" });
      setSessionKey(run.sessionKey);
      setInput("");
      poll.current = window.setInterval(async () => {
        try {
          const next = await api.status(run.runId);
          if (next.output) setAnswer(next.output);
          if (["completed", "failed", "cancelled", "stopped"].includes(next.status)) {
            if (poll.current) clearInterval(poll.current);
            setStatus(next.status === "completed" ? null : `run ${next.status}`);
            setBusy(false);
          }
        } catch (e) {
          if (poll.current) clearInterval(poll.current);
          setStatus(`suivi interrompu : ${e instanceof Error ? e.message : e}`);
          setBusy(false);
        }
      }, 900);
    } catch (e) {
      // 503 = no intelligence core configured. Say it plainly.
      setStatus(
        `JARVIS ne peut pas répondre : ${e instanceof Error ? e.message : e}. Le Core n'est peut-être pas configuré.`
      );
      setBusy(false);
    }
  }

  return (
    <section className="panel" data-testid="talk-panel">
      <h2>Que faisons-nous ?</h2>
      <p className="muted">
        {sessionKey
          ? `La conversation continue — session ${sessionKey.slice(0, 8)}…, reprenable depuis n'importe quel appareil.`
          : "Le premier échange crée une session reprenable depuis n'importe lequel de vos appareils."}
      </p>
      <form onSubmit={ask}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Parlez à JARVIS…"
          aria-label="Parler à JARVIS"
          disabled={busy}
        />{" "}
        <button type="submit" className="state-card" disabled={busy || !input.trim()}>
          {busy ? "En cours…" : "Envoyer"}
        </button>
      </form>
      {status && <p role="status">{status}</p>}
      {answer && <p data-testid="talk-answer">{answer}</p>}
    </section>
  );
}
