import { NextResponse } from "next/server";
import { sweepSuggestions } from "@/server/suggestion-engine";

export const dynamic = "force-dynamic";

/** Manual sweep — same code the scheduler tick runs every minute. */
export async function POST() {
  return NextResponse.json(await sweepSuggestions());
}
