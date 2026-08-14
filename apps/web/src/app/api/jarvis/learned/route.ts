import { NextResponse } from "next/server";
import { listLearned } from "@/server/learned-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ candidates: listLearned() });
}
