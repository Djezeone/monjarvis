import { JarvisDashboard } from "@/jarvis/components/ui/JarvisDashboard";
import { LivingInterfaceOverlay } from "@/jarvis/components/living/LivingInterfaceOverlay";
import { OrganStatus } from "@/components/organ-status";
import { CoreStatus } from "@/components/core-status";
import { RuntimeConnect } from "@/components/runtime-connect";
import { DevicePresence } from "@/components/device-presence";
import { SessionHandoff } from "@/components/session-handoff";
import { OutputRouting } from "@/components/output-routing";
import { PreferencesPanel } from "@/components/preferences-panel";
import { RoutinesPanel } from "@/components/routines-panel";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { LearnedPanel } from "@/components/learned-panel";
import { SkillsPanel } from "@/components/skills-panel";
import { PushPanel } from "@/components/push-panel";

export default function CockpitPage() {
  return (
    <div>
      <CoreStatus />
      <JarvisDashboard />
      <RuntimeConnect />
      <SessionHandoff />
      <DevicePresence />
      <OutputRouting />
      <RoutinesPanel />
      <SuggestionsPanel />
      <LearnedPanel />
      <SkillsPanel />
      <PushPanel />
      <PreferencesPanel />
      <OrganStatus />
      <LivingInterfaceOverlay />
    </div>
  );
}
