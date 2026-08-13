import { NextResponse } from "next/server";
import { getJarvisService } from "@/server/jarvis";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { service, error } = getJarvisService();
  if (!service) return NextResponse.json({ error }, { status: 503 });

  const { id } = await params;
  const body = await req.json();
  const decision = body.decision === "approve" ? "approve" : body.decision === "deny" ? "deny" : null;
  if (!decision) return NextResponse.json({ error: "decision must be approve|deny" }, { status: 400 });

  try {
    await service.hermes.approveRun(id, decision, body.approvalId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "approval failed" },
      { status: 502 }
    );
  }
}
