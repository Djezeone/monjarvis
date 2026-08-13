import { JarvisDashboard } from "@/jarvis/components/ui/JarvisDashboard";
import { OrganStatus } from "@/components/organ-status";

export default function CockpitPage() {
  return (
    <div>
      <JarvisDashboard />
      <OrganStatus />
    </div>
  );
}
