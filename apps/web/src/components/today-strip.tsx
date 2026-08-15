"use client";

import { useEffect, useState } from "react";

interface DayImpact {
  conversation: { runs: number; autonomous: number };
  actions: { executed: number; inFlight: number };
  presence: { online: number; devices: number };
  proactivity: { delivered: number };
}

/**
 * P7 brick 2 — "Today": the quiet cockpit's only permanent readout. Four
 * real numbers from the impact report over the last 24 h — enough to know
 * where JARVIS stands without opening a single world.
 */
export function TodayStrip() {
  const [day, setDay] = useState<DayImpact | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/jarvis/impact?days=1", { cache: "no-store" })
        .then((r) => r.json())
        .then(setDay)
        .catch(() => setDay(null));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!day) return null;

  const cells = [
    { label: "runs aujourd'hui", value: day.conversation.runs },
    { label: "actions exécutées", value: day.actions.executed },
    { label: "appareils en ligne", value: day.presence.online },
    { label: "suggestions livrées", value: day.proactivity.delivered },
  ];

  return (
    <p className="muted" data-testid="today-strip">
      {cells.map((c) => `${c.value} ${c.label}`).join(" · ")}
      {day.actions.inFlight > 0 && ` · ${day.actions.inFlight} en cours`}
    </p>
  );
}
