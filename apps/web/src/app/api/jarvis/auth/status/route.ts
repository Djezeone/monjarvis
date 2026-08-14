import { NextResponse } from "next/server";
import { authSecret, isAuthorizedUser } from "@/server/facade-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const enabled = Boolean(authSecret());
  return NextResponse.json({
    enabled,
    authenticated: enabled ? await isAuthorizedUser(req) : true,
  });
}
