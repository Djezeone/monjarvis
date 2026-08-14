import { NextResponse } from "next/server";
import { rejectSkill } from "@/server/skill-store";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const skill = rejectSkill(id);
  if (!skill) return NextResponse.json({ error: "unknown skill" }, { status: 404 });
  return NextResponse.json(skill);
}
