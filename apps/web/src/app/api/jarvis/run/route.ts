import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";
import { recordSessionActivity } from "@/server/session-registry";
import { getPreferences, preferenceInstructions } from "@/server/preference-store";

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
  // P5: explicit user preferences shape every answer (language, tone).
  const prefsLine = `\n${preferenceInstructions(getPreferences())}`;

  // P4 session handoff: every run belongs to a session. Reusing the returned
  // sessionKey from any device continues the same conversation.
  const sessionKey =
    typeof body.sessionKey === "string" && body.sessionKey.trim()
      ? body.sessionKey.trim()
      : randomUUID();

  try {
    const run = await service.hermes.startRun({
      input,
      sessionId: body.sessionId,
      sessionKey,
      instructions: `${body.instructions || ""}${contextLine}${prefsLine}`.trim(),
    });
    recordSessionActivity({
      sessionKey,
      runId: run.runId,
      device,
      location,
      input,
    });
    return NextResponse.json({ ...run, sessionKey });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "run failed to start" },
      { status: 502 }
    );
  }
}
