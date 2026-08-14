import { NextResponse } from "next/server";
import { startCoreRun } from "@/server/run-core";
import { authorizeRunRequest } from "@/server/run-auth";

export async function POST(req: Request) {
  const auth = await authorizeRunRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const input = String(body.input || "").trim();
  if (!input) return NextResponse.json({ error: "input required" }, { status: 400 });

  const outcome = await startCoreRun({
    input,
    sessionId: typeof body.sessionId === "string" ? body.sessionId : undefined,
    sessionKey: typeof body.sessionKey === "string" ? body.sessionKey : undefined,
    instructions: typeof body.instructions === "string" ? body.instructions : undefined,
    device: typeof body.device === "string" ? body.device : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
  });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json({ ...outcome.run, sessionKey: outcome.sessionKey });
}
