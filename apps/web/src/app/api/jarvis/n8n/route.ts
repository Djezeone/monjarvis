import { NextResponse } from "next/server";
import { listWorkflows, n8nConfig, n8nHealth } from "@/server/n8n-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    config: n8nConfig(),
    health: (await n8nHealth()).status,
    workflows: listWorkflows(),
  });
}
