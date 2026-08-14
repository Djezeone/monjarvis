import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";
import { authorizeRunRequest } from "@/server/run-auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeRunRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { service, error } = getJarvisService();
  if (!service) return NextResponse.json({ error }, { status: 503 });

  const { id } = await params;
  try {
    return NextResponse.json(await service.hermes.getRun(id));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "run lookup failed" },
      { status: 502 }
    );
  }
}
