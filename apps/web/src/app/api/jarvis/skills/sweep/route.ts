import { NextResponse } from "next/server";
import { sweepSkills } from "@/server/skill-store";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(sweepSkills());
}
