import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";

export async function POST(req: Request) {
  const { service, error } = getJarvisService();
  if (!service) return NextResponse.json({ error }, { status: 503 });

  const body = await req.json();
  const input = String(body.input || "").trim();
  if (!input) return NextResponse.json({ error: "input required" }, { status: 400 });

  try {
    const run = await service.hermes.startRun({
      input,
      sessionId: body.sessionId,
      sessionKey: body.sessionKey,
      instructions: body.instructions,
    });
    return NextResponse.json(run);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "run failed to start" },
      { status: 502 }
    );
  }
}
