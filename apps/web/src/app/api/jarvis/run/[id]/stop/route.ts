import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { service, error } = getJarvisService();
  if (!service) return NextResponse.json({ error }, { status: 503 });

  const { id } = await params;
  try {
    await service.hermes.stopRun(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stop failed" },
      { status: 502 }
    );
  }
}
