import { NextResponse } from "next/server";
import { registerDomain } from "@/server/browser-registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outcome = registerDomain(String(body.domain || ""));
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
