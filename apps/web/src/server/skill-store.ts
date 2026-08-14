import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { listSessions } from "@/server/session-registry";
import { getJarvisService } from "@/server/jarvis";
import { startCoreRun } from "@/server/run-core";
import { repeatedProcedureCandidates, type SkillCandidate } from "@/server/skill-rules";

/**
 * P5 brick 5 — skill learning behind approval (FR-009).
 *
 * The sweep observes real run history and files skill candidates with
 * provenance. A candidate is inert until the user explicitly approves it;
 * only an approved skill can be run — a real Core run, same path as every
 * other run. A rejected candidate is never proposed again. Skills live in
 * the data dir → covered by the Identity Pack.
 */

export interface Skill extends SkillCandidate {
  id: string;
  createdAt: string;
  status: "proposed" | "approved" | "rejected";
  decidedAt: string | null;
  lastRunAt: string | null;
  lastOutcome: string | null;
}

interface SkillsFile {
  skills: Skill[];
}

const MIN_REPEATS = Number(process.env.JARVIS_SKILL_MIN_REPEATS || 3);
const WINDOW_DAYS = Number(process.env.JARVIS_SKILL_WINDOW_DAYS || 14);

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "skills.json");
}

function load(): SkillsFile {
  const f = dataFile();
  if (!existsSync(f)) return { skills: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as SkillsFile;
  } catch {
    return { skills: [] };
  }
}

function save(state: SkillsFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function listSkills(): Skill[] {
  return load()
    .skills.slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
}

/**
 * Observe real history and file new candidates. Dedup by normalized prompt:
 * a procedure already proposed, approved or rejected is not filed again.
 */
export function sweepSkills(now = new Date()): { generated: number; proposed: number } {
  const events = listSessions().flatMap((s) =>
    s.activity.map((a) => ({
      input: a.input,
      device: a.device,
      sessionKey: s.sessionKey,
      at: a.at,
    }))
  );
  const found = repeatedProcedureCandidates(events, now, {
    minRepeats: MIN_REPEATS,
    windowDays: WINDOW_DAYS,
  });

  const state = load();
  let generated = 0;
  for (const candidate of found) {
    if (state.skills.some((s) => s.normalized === candidate.normalized)) continue;
    state.skills.push({
      id: randomUUID(),
      ...candidate,
      createdAt: now.toISOString(),
      status: "proposed",
      decidedAt: null,
      lastRunAt: null,
      lastOutcome: null,
    });
    generated++;
  }
  save(state);
  return {
    generated,
    proposed: state.skills.filter((s) => s.status === "proposed").length,
  };
}

/** FR-009: explicit user approval — only then does the skill become invocable. */
export function approveSkill(id: string): Skill | null {
  const state = load();
  const skill = state.skills.find((s) => s.id === id && s.status === "proposed");
  if (!skill) return null;
  skill.status = "approved";
  skill.decidedAt = new Date().toISOString();
  save(state);
  return skill;
}

/** Explicit user action: this procedure will never be proposed again. */
export function rejectSkill(id: string): Skill | null {
  const state = load();
  const skill = state.skills.find((s) => s.id === id && s.status === "proposed");
  if (!skill) return null;
  skill.status = "rejected";
  skill.decidedAt = new Date().toISOString();
  save(state);
  return skill;
}

/**
 * Run an APPROVED skill now: a real Core run through the shared entry point.
 * Waits for completion (bounded) and records the honest outcome on the skill.
 */
export async function runSkill(
  id: string
): Promise<
  | { runId: string; sessionKey: string; status: string; output: string }
  | { error: string; status: number }
> {
  const state = load();
  const skill = state.skills.find((s) => s.id === id);
  if (!skill) return { error: "unknown skill", status: 404 };
  if (skill.status !== "approved") {
    return { error: "skill non approuvé — approbation explicite requise (FR-009)", status: 409 };
  }

  const startOutcome = await startCoreRun({
    input: skill.prompt,
    device: `skill:${skill.name}`,
    instructions: `[Skill approuvé: ${skill.name}]`,
  });
  const finish = (outcome: string) => {
    const fresh = load();
    const target = fresh.skills.find((s) => s.id === id);
    if (target) {
      target.lastRunAt = new Date().toISOString();
      target.lastOutcome = outcome;
      save(fresh);
    }
  };
  if ("error" in startOutcome) {
    finish(`échec du run: ${startOutcome.error}`);
    return { error: startOutcome.error, status: startOutcome.status };
  }

  const { service } = getJarvisService();
  if (!service) return { error: "intelligence core not configured", status: 503 };

  const deadline = Date.now() + 60_000;
  let detail = startOutcome.run;
  while (
    Date.now() < deadline &&
    !["completed", "failed", "cancelled", "stopped"].includes(detail.status)
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    detail = await service.hermes.getRun(startOutcome.run.runId);
  }
  if (!detail.output) {
    detail = await service.hermes.getRun(startOutcome.run.runId);
  }

  const output = detail.output ?? "";
  finish(
    detail.status === "completed"
      ? `run ${detail.status} — ${output.slice(0, 160)}`
      : `run ${detail.status}, sans sortie`
  );
  return {
    runId: startOutcome.run.runId,
    sessionKey: startOutcome.sessionKey,
    status: detail.status,
    output,
  };
}
