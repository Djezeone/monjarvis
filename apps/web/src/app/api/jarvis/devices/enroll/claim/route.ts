import { NextResponse } from "next/server";
import { claimEnrollment } from "@/server/device-registry";

export const dynamic = "force-dynamic";

const VALID_KINDS = ["phone", "desktop", "laptop", "home-node", "wearable", "other"] as const;

/**
 * Agent-side: exchange a valid one-time enrollment code for a per-device
 * token. The plaintext token is returned exactly once — only its SHA-256
 * hash is stored server-side.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const code = String(body.code || "").trim();
  const id = String(body.id || "").trim();
  const name = String(body.name || "").trim();
  const kind = String(body.kind || "other");
  const capabilities = Array.isArray(body.capabilities)
    ? body.capabilities.map(String)
    : [];
  if (!code || !id || !name) {
    return NextResponse.json({ error: "code, id and name required" }, { status: 400 });
  }
  const outcome = claimEnrollment(code, {
    id,
    name,
    kind: (VALID_KINDS as readonly string[]).includes(kind)
      ? (kind as (typeof VALID_KINDS)[number])
      : "other",
    capabilities,
  });
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  const { tokenHash: _tokenHash, ...device } = outcome.device;
  return NextResponse.json({ device, token: outcome.token });
}
