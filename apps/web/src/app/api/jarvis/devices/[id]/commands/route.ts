import { NextResponse } from "next/server";
import { checkDeviceAuth, pullCommands } from "@/server/device-registry";

export const dynamic = "force-dynamic";

/** Device agents poll their pending commands over the private mesh. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkDeviceAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  return NextResponse.json({ commands: pullCommands(id) });
}
