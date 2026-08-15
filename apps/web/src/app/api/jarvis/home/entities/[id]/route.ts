import { NextResponse } from "next/server";
import { removeEntity } from "@/server/home-registry";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!removeEntity(id)) {
    return NextResponse.json({ error: "entité inconnue" }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
