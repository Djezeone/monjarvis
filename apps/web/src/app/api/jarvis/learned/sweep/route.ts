import { NextResponse } from "next/server";
import { sweepLearned } from "@/server/learned-store";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(sweepLearned());
}
