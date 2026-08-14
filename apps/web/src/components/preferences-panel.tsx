"use client";

import { useEffect, useState } from "react";

interface Prefs {
  language: string;
  tone: string;
  quietHours: { start: string; end: string } | null;
  preferredDevice: string;
  proactivity: "off" | "low" | "normal";
}

/**
 * P5 — explicit preferences. Everything here is user-set, never inferred,
 * and has real effects: injected into every run's instructions, and
 * consulted by the output router (quiet hours, preferred device).
 */
export function PreferencesPanel() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [quietOn, setQuietOn] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/jarvis/preferences", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => {
        setPrefs(p);
        setQuietOn(Boolean(p.quietHours));
      })
      .catch(() => setNotice("Impossible de lire les préférences."));
  }, []);

  async function save() {
    if (!prefs) return;
    setNotice("");
    const r = await fetch("/api/jarvis/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...prefs, quietHours: quietOn ? prefs.quietHours : null }),
    });
    setNotice(r.ok ? "Préférences enregistrées — appliquées aux prochains runs et livraisons." : `Échec (${r.status})`);
  }

  if (!prefs) return <section className="panel"><h2>Préférences</h2><p className="muted">{notice || "Chargement…"}</p></section>;

  return (
    <section className="panel">
      <h2>Préférences</h2>
      <p className="muted">
        Explicites uniquement — rien n&apos;est inféré. Injectées dans chaque
        run ; heures calmes et appareil préféré pilotent le routage.
      </p>
      <p>
        <label>
          Langue{" "}
          <input
            value={prefs.language}
            onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
            size={4}
          />
        </label>{" "}
        <label>
          Ton{" "}
          <input
            value={prefs.tone}
            placeholder="concis et direct"
            onChange={(e) => setPrefs({ ...prefs, tone: e.target.value })}
            size={24}
          />
        </label>
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            checked={quietOn}
            onChange={(e) => {
              setQuietOn(e.target.checked);
              if (e.target.checked && !prefs.quietHours) {
                setPrefs({ ...prefs, quietHours: { start: "22:00", end: "07:30" } });
              }
            }}
          />{" "}
          Heures calmes
        </label>{" "}
        {quietOn && prefs.quietHours && (
          <>
            <input
              type="time"
              aria-label="Début des heures calmes"
              value={prefs.quietHours.start}
              onChange={(e) =>
                setPrefs({ ...prefs, quietHours: { ...prefs.quietHours!, start: e.target.value } })
              }
            />{" "}
            →{" "}
            <input
              type="time"
              aria-label="Fin des heures calmes"
              value={prefs.quietHours.end}
              onChange={(e) =>
                setPrefs({ ...prefs, quietHours: { ...prefs.quietHours!, end: e.target.value } })
              }
            />
          </>
        )}
      </p>
      <p>
        <label>
          Appareil de sortie préféré{" "}
          <input
            value={prefs.preferredDevice}
            placeholder="id d'appareil (optionnel)"
            onChange={(e) => setPrefs({ ...prefs, preferredDevice: e.target.value })}
            size={20}
          />
        </label>{" "}
        <label>
          Proactivité{" "}
          <select
            value={prefs.proactivity}
            onChange={(e) =>
              setPrefs({ ...prefs, proactivity: e.target.value as Prefs["proactivity"] })
            }
          >
            <option value="off">off</option>
            <option value="low">basse</option>
            <option value="normal">normale</option>
          </select>
        </label>
      </p>
      <p>
        <button type="button" className="state-card" onClick={save}>
          Enregistrer
        </button>
      </p>
      {notice && <p className="muted">{notice}</p>}
    </section>
  );
}
