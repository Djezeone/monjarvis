import { NextResponse } from "next/server";
import { checkDeviceAuth, completeCommand } from "@/server/device-registry";

export const dynamic = "force-dynamic";

/** Device agents report the real outcome of an executed command. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const auth = checkDeviceAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, cid } = await params;
  const body = await req.json().catch(() => ({}));
  const command = completeCommand(id, cid, {
    ok: Boolean(body.ok),
    result: body.result,
    error: body.error ? String(body.error) : undefined,
  });
  if (!command) return NextResponse.json({ error: "unknown command" }, { status: 404 });
  return NextResponse.json(command);
}
