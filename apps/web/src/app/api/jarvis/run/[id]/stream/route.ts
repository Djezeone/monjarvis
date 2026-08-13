import { getJarvisService } from "@/server/jarvis";

export const dynamic = "force-dynamic";

/**
 * Sanitizing SSE proxy (P3 build order, step 8): browser → this route → Hermes.
 * The Hermes bearer key stays server-side; HermesRunsAdapter.translateSse
 * already reduces upstream events to the sanitized IntelligenceEvent union
 * (text deltas, tool name/status, subagent lifecycle, run status, approval
 * metadata) — no env vars, credentials, or raw tool arguments are forwarded.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { service, error } = getJarvisService();
  if (!service) return Response.json({ error }, { status: 503 });

  const { id } = await params;
  const encoder = new TextEncoder();
  const TERMINAL = new Set(["completed", "failed", "stopped"]);

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        abort();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const abort = service.hermes.streamRun(id, (event) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        if (
          (event.type === "run.status" && TERMINAL.has(event.status)) ||
          event.type === "run.completed" ||
          event.type === "run.failed"
        ) {
          close();
        }
      });
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
