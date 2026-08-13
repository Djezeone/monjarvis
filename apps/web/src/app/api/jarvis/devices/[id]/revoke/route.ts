import { NextResponse } from "next/server";
import { revokeDevice } from "@/server/device-registry";

export const dynamic = "force-dynamic";

/** Operator-side: revoke a satellite — its token stops working immediately. */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = revokeDevice(id);
  if (!device) return NextResponse.json({ error: "unknown device" }, { status: 404 });
  return NextResponse.json({ ok: true, revokedAt: device.revokedAt });
}
