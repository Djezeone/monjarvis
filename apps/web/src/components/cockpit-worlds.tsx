"use client";

import { useEffect, useState } from "react";
import { JarvisDashboard } from "@/jarvis/components/ui/JarvisDashboard";
import { RuntimeConnect } from "@/components/runtime-connect";
import { SessionHandoff } from "@/components/session-handoff";
import { DevicePresence } from "@/components/device-presence";
import { OutputRouting } from "@/components/output-routing";
import { PreferencesPanel } from "@/components/preferences-panel";
import { RoutinesPanel } from "@/components/routines-panel";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { LearnedPanel } from "@/components/learned-panel";
import { SkillsPanel } from "@/components/skills-panel";
import { PushPanel } from "@/components/push-panel";
import { ImpactPanel } from "@/components/impact-panel";
import { N8nPanel } from "@/components/n8n-panel";
import { HomePanel } from "@/components/home-panel";
import { BrowserPanel } from "@/components/browser-panel";
import { OrganStatus } from "@/components/organ-status";
import { TodayStrip } from "@/components/today-strip";
import { TalkPanel } from "@/components/talk-panel";

/**
 * P7 brick 2 — the cockpit as WORLDS, not a stack of panels.
 *
 * CBOS rule applied literally: the public entrance is cinematic, the daily
 * cockpit is quiet, fast and operational. At rest only one world is
 * mounted — the others cost nothing until you enter them.
 *
 * Where CBOS names a sub-world JARVIS does not have yet, the world says so
 * (`missing`) instead of showing an empty shelf: an absence stated is
 * worth more than a feature implied.
 */
const WORLDS = [
  {
    id: "core",
    label: "Core",
    summary: "Parler, l'état du Core, le runtime vocal.",
    missing: null,
  },
  {
    id: "memoire",
    label: "Mémoire",
    summary: "Sessions continues et ce que JARVIS a appris de vous.",
    missing:
      "Personnes, projets et frise temporelle : portés par Graphiti — pas encore exposés ici tant que le service mémoire n'est pas branché.",
  },
  {
    id: "agents",
    label: "Agents",
    summary: "Les spécialistes appris, approuvés par vous.",
    missing:
      "Sous-agents Hermes actifs et délégations : nécessitent un Hermes réel — la file de runs les affichera dès qu'il tourne.",
  },
  {
    id: "action",
    label: "Action",
    summary: "Ce que JARVIS fait, seul ou sur demande — et ce qu'il a fait.",
    missing: null,
  },
  {
    id: "monde",
    label: "Monde",
    summary: "Vos appareils, le routage des sorties, les notifications.",
    missing: null,
  },
  {
    id: "systeme",
    label: "Système",
    summary: "Préférences, organes, état réel des services.",
    missing: null,
  },
] as const;

type WorldId = (typeof WORLDS)[number]["id"];

const STORAGE_KEY = "jarvis-world";

function isWorld(value: string): value is WorldId {
  return WORLDS.some((w) => w.id === value);
}

export function CockpitWorlds() {
  const [world, setWorld] = useState<WorldId>("core");

  // Read the wanted world only after mount: the server render cannot know
  // the hash or the stored choice, and guessing would desync hydration.
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "");
    if (isWorld(fromHash)) {
      setWorld(fromHash);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY) || "";
    if (isWorld(stored)) setWorld(stored);
  }, []);

  function enter(id: WorldId) {
    setWorld(id);
    window.localStorage.setItem(STORAGE_KEY, id);
    window.history.replaceState(null, "", `#${id}`);
  }

  const current = WORLDS.find((w) => w.id === world)!;

  return (
    <>
      <nav className="panel" aria-label="Mondes JARVIS" data-testid="world-nav">
        {WORLDS.map((w) => (
          <button
            key={w.id}
            type="button"
            className="state-card"
            aria-current={w.id === world ? "page" : undefined}
            data-active={w.id === world ? "true" : undefined}
            onClick={() => enter(w.id)}
          >
            {w.label}
          </button>
        ))}
        <TodayStrip />
      </nav>

      <section aria-live="polite" data-testid="world-content" data-world={world}>
        <p className="muted">{current.summary}</p>

        {world === "core" && (
          <>
            <TalkPanel />
            <JarvisDashboard />
            <RuntimeConnect />
          </>
        )}
        {world === "memoire" && (
          <>
            <SessionHandoff />
            <LearnedPanel />
          </>
        )}
        {world === "agents" && <SkillsPanel />}
        {world === "action" && (
          <>
            <RoutinesPanel />
            <SuggestionsPanel />
            <N8nPanel />
            <BrowserPanel />
            <ImpactPanel />
          </>
        )}
        {world === "monde" && (
          <>
            <DevicePresence />
            <HomePanel />
            <OutputRouting />
            <PushPanel />
          </>
        )}
        {world === "systeme" && (
          <>
            <PreferencesPanel />
            <OrganStatus />
          </>
        )}

        {current.missing && (
          <p className="muted" data-testid="world-missing">
            Pas encore ici : {current.missing}
          </p>
        )}
      </section>
    </>
  );
}
