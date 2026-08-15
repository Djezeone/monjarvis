import { NextResponse } from "next/server";
import { registerEntity } from "@/server/home-registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outcome = registerEntity({
    entityId: String(body.entityId || ""),
    label: typeof body.label === "string" ? body.label : "",
  });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
