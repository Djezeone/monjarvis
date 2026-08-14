import "server-only";
import { randomUUID } from "node:crypto";
import { getJarvisService } from "@/server/jarvis";
import { recordSessionActivity } from "@/server/session-registry";
import { getPreferences, preferenceInstructions } from "@/server/preference-store";

/**
 * Shared run entry point: the /api/jarvis/run route and Core-side callers
 * (routines) go through the same path — session binding, device context and
 * preference injection behave identically everywhere.
 */
export async function startCoreRun(input: {
  input: string;
  sessionId?: string;
  sessionKey?: string;
  instructions?: string;
  device?: string;
  location?: string;
}): Promise<
  | { run: Awaited<ReturnType<NonNullable<ReturnType<typeof getJarvisService>["service"]>["hermes"]["startRun"]>>; sessionKey: string }
  | { error: string; status: number }
> {
  const { service, error } = getJarvisService();
  if (!service) return { error: error ?? "intelligence core not configured", status: 503 };

  const device = input.device?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  const contextLine =
    device || location
      ? `\n[Contexte appareil: ${[device && `device=${device}`, location && `location=${location}`]
          .filter(Boolean)
          .join(", ")}]`
      : "";
  const prefsLine = `\n${preferenceInstructions(getPreferences())}`;
  const sessionKey = input.sessionKey?.trim() || randomUUID();

  try {
    const run = await service.hermes.startRun({
      input: input.input,
      sessionId: input.sessionId,
      sessionKey,
      instructions: `${input.instructions || ""}${contextLine}${prefsLine}`.trim(),
    });
    recordSessionActivity({
      sessionKey,
      runId: run.runId,
      device,
      location,
      input: input.input,
    });
    return { run, sessionKey };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "run failed to start",
      status: 502,
    };
  }
}
