import { NextResponse } from "next/server";
import { listSuggestions } from "@/server/suggestion-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ suggestions: listSuggestions() });
}
