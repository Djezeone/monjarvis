import { LabAssetDiagnostics } from "@/components/lab-asset-diagnostics";
import { CoreStatePanel } from "@/components/core-state-panel";

export default function LabCorePage() {
  return (
    <div>
      <h1>Lab — Core (huit états)</h1>
      <CoreStatePanel />
      <LabAssetDiagnostics route="/lab/core" />
    </div>
  );
}
