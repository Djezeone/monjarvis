import { NextResponse } from "next/server";
import { homeConfig, homeHealth, listEntities } from "@/server/home-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    config: homeConfig(),
    health: (await homeHealth()).status,
    entities: listEntities(),
  });
}
