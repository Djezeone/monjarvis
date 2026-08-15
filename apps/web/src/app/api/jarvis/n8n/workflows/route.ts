import { NextResponse } from "next/server";
import { registerWorkflow } from "@/server/n8n-registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outcome = registerWorkflow({
    name: String(body.name || ""),
    path: String(body.path || ""),
    description: typeof body.description === "string" ? body.description : "",
  });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
