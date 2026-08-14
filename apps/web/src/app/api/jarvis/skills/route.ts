import { NextResponse } from "next/server";
import { listSkills } from "@/server/skill-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ skills: listSkills() });
}
