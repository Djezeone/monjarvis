import { NextResponse } from "next/server";
import { runBrowserTask } from "@/server/browser-registry";

export const dynamic = "force-dynamic";

/**
 * Run a browser task. Every task is CRITICAL: 428 until an explicit
 * approval is attached — a browser carries logged-in sessions, and JARVIS
 * cannot know in advance what a free-text task will click.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const outcome = await runBrowserTask({
    task: String(body.task || ""),
    domains: Array.isArray(body.domains) ? body.domains.map(String) : [],
    maxSteps: typeof body.maxSteps === "number" ? body.maxSteps : undefined,
    approvedBy:
      typeof body.approvedBy === "string" && body.approvedBy.trim()
        ? body.approvedBy.trim()
        : undefined,
  });
  if ("error" in outcome) {
    return NextResponse.json(
      { error: outcome.error, requiresApproval: outcome.requiresApproval },
      { status: outcome.status }
    );
  }
  return NextResponse.json(outcome);
}
