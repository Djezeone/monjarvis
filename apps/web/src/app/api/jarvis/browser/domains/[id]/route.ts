import { NextResponse } from "next/server";
import { removeDomain } from "@/server/browser-registry";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!removeDomain(id)) {
    return NextResponse.json({ error: "domaine inconnu" }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
