import Link from "next/link";
import { getScreenMapping } from "@/lib/screen-mapping";

export default function LandingPage() {
  const mapping = getScreenMapping("/");
  return (
    <div>
      <section className="hero">
        <h1>Une intelligence personnelle présente</h1>
        <p className="muted">
          JARVIS X2 — Personal Agent OS local-first. Cinématique à l&apos;entrée,
          calme dans l&apos;usage.
        </p>
        <p>
          <Link href="/app">Entrer dans le cockpit →</Link>
        </p>
      </section>

      <section className="panel">
        <h2>État de la scène cinématique</h2>
        <p className="muted">
          La landing finale (Core 3D, scroll narratif) requiert les binaires du
          pack d&apos;assets. Les {mapping?.primary_assets.length ?? 0} assets
          mappés pour cette route sont référencés par ID canonique mais leurs
          fichiers ne sont pas encore présents dans <code>public/assets</code> —
          cette page reste donc un fallback 2D explicite (NFR-004 / FR-012).
        </p>
        {mapping?.rules && (
          <ul className="muted">
            {mapping.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
