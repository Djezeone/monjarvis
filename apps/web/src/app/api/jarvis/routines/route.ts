import { NextResponse } from "next/server";
import { createRoutine, listRoutines } from "@/server/routine-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ routines: listRoutines() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const prompt = String(body.prompt || "").trim();
  if (!name || !prompt) {
    return NextResponse.json({ error: "name and prompt required" }, { status: 400 });
  }

  let schedule;
  if (body.schedule?.kind === "daily" && /^\d{2}:\d{2}$/.test(String(body.schedule.time))) {
    schedule = { kind: "daily" as const, time: String(body.schedule.time) };
  } else if (
    body.schedule?.kind === "interval" &&
    Number.isFinite(Number(body.schedule.minutes)) &&
    Number(body.schedule.minutes) >= 1
  ) {
    schedule = { kind: "interval" as const, minutes: Math.floor(Number(body.schedule.minutes)) };
  } else {
    return NextResponse.json(
      { error: 'schedule must be {kind:"daily",time:"HH:MM"} or {kind:"interval",minutes>=1}' },
      { status: 400 }
    );
  }

  const routine = createRoutine({
    name: name.slice(0, 80),
    prompt: prompt.slice(0, 2000),
    schedule,
    modality: body.modality === "voice" ? "voice" : "notification",
    enabled: body.enabled !== false,
  });
  return NextResponse.json(routine);
}
