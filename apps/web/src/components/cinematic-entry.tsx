"use client";

import dynamic from "next/dynamic";

/**
 * The heavy Canvas experience is client-only and lazy (P1 guide: use
 * dynamic ssr:false for heavy Canvas components). CinematicExperience
 * carries its own reduced-motion, skip, and no-WebGL fallbacks.
 */
const CinematicExperience = dynamic(
  () =>
    import("@/jarvis/components/cinematic/CinematicExperience").then(
      (m) => m.CinematicExperience
    ),
  {
    ssr: false,
    loading: () => (
      <p className="muted" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        Chargement de l&apos;expérience…
      </p>
    ),
  }
);

export function CinematicEntry() {
  return <CinematicExperience />;
}
