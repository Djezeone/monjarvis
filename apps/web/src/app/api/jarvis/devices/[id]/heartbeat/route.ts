import { NextResponse } from "next/server";
import { authenticateDevice, heartbeat } from "@/server/device-registry";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = authenticateDevice(req, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const status =
    body && typeof body.status === "object" && body.status !== null ? body.status : {};
  const device = heartbeat(id, status);
  if (!device) return NextResponse.json({ error: "unknown device" }, { status: 404 });
  return NextResponse.json({ ok: true, lastSeenAt: device.lastSeenAt });
}
