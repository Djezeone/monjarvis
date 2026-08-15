import "server-only";
import { listCommands, listDevices } from "@/server/device-registry";
import { listSessions } from "@/server/session-registry";
import { listSuggestions } from "@/server/suggestion-engine";
import { listLearned } from "@/server/learned-store";
import { listSkills } from "@/server/skill-store";
import { listRoutines } from "@/server/routine-registry";
import { listExecutions, listWorkflows } from "@/server/n8n-registry";
import { listEntities, listHomeExecutions } from "@/server/home-registry";
import {
  commandImpact,
  decisionImpact,
  inWindow,
  suggestionImpact,
  NOT_MEASURED,
} from "@/server/impact-rules";

/**
 * P7 brick 1 — Impact Layer: what JARVIS actually did, read from the same
 * registries that drive behaviour. No separate analytics store, so the
 * numbers can never drift from reality — and nothing is estimated.
 */
export function impactReport(days = 30, now = new Date()) {
  const commands = commandImpact(
    listCommands().map((c) => ({
      state: c.state,
      tier: c.policy.tier,
      approvedBy: c.policy.approvedBy,
      at: c.createdAt,
    })),
    now,
    days
  );

  const runs = inWindow(
    listSessions().flatMap((s) => s.activity.map((a) => ({ at: a.at, device: a.device }))),
    now,
    days
  );
  const sessions = inWindow(
    listSessions().map((s) => ({ ...s, at: s.updatedAt })),
    now,
    days
  );

  const devices = listDevices();
  const skills = listSkills();
  const routines = listRoutines();

  return {
    windowDays: days,
    generatedAt: now.toISOString(),
    conversation: {
      runs: runs.length,
      sessions: sessions.length,
      /** Runs JARVIS started on its own (routines, skills, replays). */
      autonomous: runs.filter(
        (r) =>
          r.device.startsWith("routine:") ||
          r.device.startsWith("skill:") ||
          r.device === "reprise-façade"
      ).length,
    },
    actions: commands,
    presence: {
      devices: devices.length,
      online: devices.filter((d) => d.online).length,
      revoked: devices.filter((d) => d.revoked).length,
    },
    proactivity: suggestionImpact(listSuggestions(), now, days),
    learning: {
      preferences: decisionImpact(listLearned(), now, days, "promoted"),
      skills: {
        ...decisionImpact(skills, now, days, "approved"),
        executed: skills.filter((s) => s.lastRunAt).length,
      },
    },
    routines: {
      total: routines.length,
      enabled: routines.filter((r) => r.enabled).length,
      everRun: routines.filter((r) => r.lastRunAt).length,
    },
    automations: (() => {
      const runs = inWindow(listExecutions(), now, days);
      return {
        declared: listWorkflows().length,
        executed: runs.filter((e) => e.ok).length,
        failed: runs.filter((e) => !e.ok).length,
      };
    })(),
    home: (() => {
      const calls = inWindow(listHomeExecutions(), now, days);
      return {
        declared: listEntities().length,
        executed: calls.filter((e) => e.ok).length,
        failed: calls.filter((e) => !e.ok).length,
        approved: calls.filter((e) => e.ok && e.approvedBy).length,
      };
    })(),
    notMeasured: NOT_MEASURED,
  };
}

export type ImpactReport = ReturnType<typeof impactReport>;
