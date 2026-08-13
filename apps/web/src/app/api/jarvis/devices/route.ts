import { NextResponse } from "next/server";
import {
  authenticateDevice,
  listDevices,
  updateDevice,
} from "@/server/device-registry";

export const dynamic = "force-dynamic";

/** Presence list for the cockpit UI — real heartbeat-derived state only. */
export async function GET() {
  return NextResponse.json({ devices: listDevices() });
}

/**
 * Authenticated re-registration: an enrolled satellite updates its own
 * name/kind/capabilities. Enrollment itself goes through
 * /api/jarvis/devices/enroll/claim with a one-time code.
 */
export async function POST(req: Request) {
  const auth = authenticateDevice(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const validKinds = ["phone", "desktop", "laptop", "home-node", "wearable", "other"] as const;
  const kind = String(body.kind || "");
  const device = updateDevice(auth.device.id, {
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
    kind: (validKinds as readonly string[]).includes(kind)
      ? (kind as (typeof validKinds)[number])
      : undefined,
    capabilities: Array.isArray(body.capabilities)
      ? body.capabilities.map(String)
      : undefined,
  });
  if (!device) return NextResponse.json({ error: "unknown device" }, { status: 404 });
  const { tokenHash: _tokenHash, ...safe } = device;
  return NextResponse.json(safe);
}
