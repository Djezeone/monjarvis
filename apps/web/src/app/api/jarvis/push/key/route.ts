import { NextResponse } from "next/server";
import { vapidPublicKey, listSubscriptions } from "@/server/push-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = vapidPublicKey();
  return NextResponse.json({
    configured: Boolean(publicKey),
    publicKey,
    subscriptions: listSubscriptions().length,
  });
}
