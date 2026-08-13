import { NextResponse } from "next/server";
import {
  checkDeviceAuth,
  listDevices,
  registerDevice,
} from "@/server/device-registry";

export const dynamic = "force-dynamic";

/** Presence list for the cockpit UI — real heartbeat-derived state only. */
export async function GET() {
  return NextResponse.json({ devices: listDevices() });
}

/** Satellite registration (device agents authenticate with the mesh secret). */
export async function POST(req: Request) {
  const auth = checkDeviceAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const id = String(body.id || "").trim();
  const name = String(body.name || "").trim();
  const kind = String(body.kind || "other");
  const capabilities = Array.isArray(body.capabilities)
    ? body.capabilities.map(String)
    : [];
  if (!id || !name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }
  const validKinds = ["phone", "desktop", "laptop", "home-node", "wearable", "other"] as const;
  const record = registerDevice({
    id,
    name,
    kind: (validKinds as readonly string[]).includes(kind)
      ? (kind as (typeof validKinds)[number])
      : "other",
    capabilities,
  });
  return NextResponse.json(record);
}
