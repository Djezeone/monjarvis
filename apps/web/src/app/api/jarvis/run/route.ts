import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";

export async function POST(req: Request) {
  const { service, error } = getJarvisService();
  if (!service) return NextResponse.json({ error }, { status: 503 });

  const body = await req.json();
  const input = String(body.input || "").trim();
  if (!input) return NextResponse.json({ error: "input required" }, { status: 400 });

  // P4: identity follows the user, not the device — requests may carry the
  // originating device/location so the Core can reason with that context
  // (and later route the answer to the right satellite).
  const device = typeof body.device === "string" ? body.device.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const contextLine =
    device || location
      ? `\n[Contexte appareil: ${[device && `device=${device}`, location && `location=${location}`]
          .filter(Boolean)
          .join(", ")}]`
      : "";

  try {
    const run = await service.hermes.startRun({
      input,
      sessionId: body.sessionId,
      sessionKey: body.sessionKey,
      instructions: body.instructions
        ? `${body.instructions}${contextLine}`
        : contextLine || undefined,
    });
    return NextResponse.json(run);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "run failed to start" },
      { status: 502 }
    );
  }
}
