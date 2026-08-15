import { NextResponse } from "next/server";
import { impactReport } from "@/server/impact";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days") || 30);
  return NextResponse.json(impactReport(Number.isFinite(days) && days > 0 ? days : 30));
}
