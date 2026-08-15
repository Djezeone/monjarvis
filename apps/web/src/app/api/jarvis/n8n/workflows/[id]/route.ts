import { NextResponse } from "next/server";
import { removeWorkflow } from "@/server/n8n-registry";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!removeWorkflow(id)) {
    return NextResponse.json({ error: "workflow inconnu" }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
