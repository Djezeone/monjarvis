import { NextResponse } from "next/server";
import { dismissSuggestion } from "@/server/suggestion-engine";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suggestion = dismissSuggestion(id);
  if (!suggestion) return NextResponse.json({ error: "unknown suggestion" }, { status: 404 });
  return NextResponse.json(suggestion);
}
