import { LivingInterfaceLab } from "@/jarvis/components/lab/LivingInterfaceLab";
import { LabAssetDiagnostics } from "@/components/lab-asset-diagnostics";

export default function LabLivingPage() {
  return (
    <div>
      <LivingInterfaceLab />
      <LabAssetDiagnostics route="/lab/living" />
    </div>
  );
}
