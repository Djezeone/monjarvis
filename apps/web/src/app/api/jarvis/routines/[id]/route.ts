import { NextResponse } from "next/server";
import { deleteRoutine, updateRoutine } from "@/server/routine-registry";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Parameters<typeof updateRoutine>[1] = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (typeof body.prompt === "string" && body.prompt.trim()) patch.prompt = body.prompt.slice(0, 2000);
  if (body.modality === "voice" || body.modality === "notification") patch.modality = body.modality;

  const routine = updateRoutine(id, patch);
  if (!routine) return NextResponse.json({ error: "unknown routine" }, { status: 404 });
  return NextResponse.json(routine);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deleteRoutine(id)) return NextResponse.json({ error: "unknown routine" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
