import { NextResponse } from "next/server";
import {
  getPreferences,
  setPreferences,
  type Preferences,
} from "@/server/preference-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getPreferences());
}

/** Explicit preference updates only — this endpoint never infers anything. */
export async function PUT(req: Request) {
  const body = await req.json();
  const patch: Partial<Preferences> = {};

  if (typeof body.language === "string" && body.language.trim()) {
    patch.language = body.language.trim().slice(0, 10);
  }
  if (typeof body.tone === "string") patch.tone = body.tone.slice(0, 200);
  if (body.quietHours === null) patch.quietHours = null;
  else if (
    body.quietHours &&
    /^\d{2}:\d{2}$/.test(String(body.quietHours.start)) &&
    /^\d{2}:\d{2}$/.test(String(body.quietHours.end))
  ) {
    patch.quietHours = {
      start: String(body.quietHours.start),
      end: String(body.quietHours.end),
    };
  }
  if (typeof body.preferredDevice === "string") {
    patch.preferredDevice = body.preferredDevice.trim().slice(0, 100);
  }
  if (["off", "low", "normal"].includes(body.proactivity)) {
    patch.proactivity = body.proactivity;
  }

  return NextResponse.json(setPreferences(patch));
}
