import { JarvisDashboard } from "@/jarvis/components/ui/JarvisDashboard";
import { LivingInterfaceOverlay } from "@/jarvis/components/living/LivingInterfaceOverlay";
import { OrganStatus } from "@/components/organ-status";
import { RuntimeConnect } from "@/components/runtime-connect";
import { DevicePresence } from "@/components/device-presence";

export default function CockpitPage() {
  return (
    <div>
      <JarvisDashboard />
      <RuntimeConnect />
      <DevicePresence />
      <OrganStatus />
      <LivingInterfaceOverlay />
    </div>
  );
}
