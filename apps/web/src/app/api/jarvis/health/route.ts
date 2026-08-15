import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";
import { n8nHealth } from "@/server/n8n-registry";
import { homeHealth } from "@/server/home-registry";

export const dynamic = "force-dynamic";

export type OrganHealth = {
  name: string;
  role: string;
  status: "connected" | "unreachable" | "not_configured" | "configured_unverified";
};

/**
 * Real organ availability, aggregated server-side. Only reports what can
 * actually be verified: reachable health endpoints, or configuration
 * presence where no health contract exists. No secrets leave the server.
 */
export async function GET() {
  const { service } = getJarvisService();

  const organs: OrganHealth[] = [];

  if (!service) {
    organs.push({ name: "Hermes Core", role: "Orchestration des runs, stop, approbations", status: "not_configured" });
    organs.push({ name: "Graphiti + Neo4j", role: "Mémoire temporelle", status: "not_configured" });
  } else {
    const hermesOk = await service.hermes.health().catch(() => false);
    organs.push({
      name: "Hermes Core",
      role: "Orchestration des runs, stop, approbations",
      status: hermesOk ? "connected" : "unreachable",
    });
    const memoryOk = await service.memory.health().catch(() => false);
    organs.push({
      name: "Graphiti + Neo4j",
      role: "Mémoire temporelle",
      status: memoryOk ? "connected" : "unreachable",
    });
  }

  // P8 brick 2: one probe, one verdict — the connector owns it now.
  organs.push({
    name: "Home Assistant",
    role: "Monde physique — entités allowlistées",
    status: (await homeHealth()).status,
  });

  // No health contract exists for these two adapters: report configuration
  // presence only, never a fabricated reachability verdict.
  // P8: n8n DOES expose /healthz — probe it for real when the base URL is
  // known, and fall back to configuration presence only when it is not.
  const n8n = await n8nHealth();
  organs.push({
    name: "n8n",
    role: "Workflows allowlistés",
    status:
      n8n.status !== "not_configured"
        ? n8n.status
        : process.env.N8N_JARVIS_SECRET
          ? "configured_unverified"
          : "not_configured",
  });
  organs.push({
    name: "Browser worker",
    role: "Browser use sandboxé (désactivé par défaut)",
    status: process.env.JARVIS_BROWSER_WORKER_TOKEN ? "configured_unverified" : "not_configured",
  });

  return NextResponse.json({ organs, checkedAt: new Date().toISOString() });
}
