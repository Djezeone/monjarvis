import { CoreStatus } from "@/components/core-status";
import { CockpitWorlds } from "@/components/cockpit-worlds";
import { LivingInterfaceOverlay } from "@/jarvis/components/living/LivingInterfaceOverlay";

/**
 * The cockpit. Two things sit outside the worlds on purpose: the Core
 * offline banner (an alert must never hide behind a tab) and the living
 * interface overlay (ambient, present everywhere).
 */
export default function CockpitPage() {
  return (
    <div>
      <CoreStatus />
      <CockpitWorlds />
      <LivingInterfaceOverlay />
    </div>
  );
}
