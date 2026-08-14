import { JarvisDashboard } from "@/jarvis/components/ui/JarvisDashboard";
import { LivingInterfaceOverlay } from "@/jarvis/components/living/LivingInterfaceOverlay";
import { OrganStatus } from "@/components/organ-status";
import { RuntimeConnect } from "@/components/runtime-connect";
import { DevicePresence } from "@/components/device-presence";
import { SessionHandoff } from "@/components/session-handoff";
import { OutputRouting } from "@/components/output-routing";

export default function CockpitPage() {
  return (
    <div>
      <JarvisDashboard />
      <RuntimeConnect />
      <SessionHandoff />
      <DevicePresence />
      <OutputRouting />
      <OrganStatus />
      <LivingInterfaceOverlay />
    </div>
  );
}
