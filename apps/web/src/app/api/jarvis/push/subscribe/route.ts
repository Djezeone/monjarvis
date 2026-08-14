import { NextResponse } from "next/server";
import { addSubscription, removeSubscription } from "@/server/push-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "subscription incomplète" }, { status: 400 });
  }
  return NextResponse.json(addSubscription({ endpoint, keys: { p256dh, auth } }));
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) return NextResponse.json({ error: "endpoint requis" }, { status: 400 });
  return NextResponse.json({ removed: removeSubscription(endpoint) });
}
