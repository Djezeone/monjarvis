import { IntelligenceCoreLab } from "@/jarvis/components/lab/IntelligenceCoreLab";
import { LabAssetDiagnostics } from "@/components/lab-asset-diagnostics";

export default function LabIntelligencePage() {
  return (
    <div>
      <IntelligenceCoreLab />
      <LabAssetDiagnostics route="/lab/intelligence" />
    </div>
  );
}
