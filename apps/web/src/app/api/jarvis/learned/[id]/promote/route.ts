import { NextResponse } from "next/server";
import { promoteLearned } from "@/server/learned-store";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = promoteLearned(id);
  if (!candidate) return NextResponse.json({ error: "unknown proposal" }, { status: 404 });
  return NextResponse.json(candidate);
}
