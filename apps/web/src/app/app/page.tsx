import { CoreStatePanel } from "@/components/core-state-panel";
import { OrganStatus } from "@/components/organ-status";

export default function CockpitPage() {
  return (
    <div>
      <h1>Cockpit</h1>
      <p className="muted">
        Cockpit de production calme (PRD §11). Le Core est l&apos;indicateur
        d&apos;état principal ; les panneaux apparaissent quand ils ont une
        valeur opérationnelle.
      </p>
      <CoreStatePanel />
      <OrganStatus />
    </div>
  );
}
