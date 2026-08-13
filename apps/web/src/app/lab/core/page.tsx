import { JarvisP0DemoPage } from "@/jarvis/components/ui/JarvisP0DemoPage";
import { LabAssetDiagnostics } from "@/components/lab-asset-diagnostics";

export default function LabCorePage() {
  return (
    <div>
      <JarvisP0DemoPage />
      <LabAssetDiagnostics route="/lab/core" />
    </div>
  );
}
