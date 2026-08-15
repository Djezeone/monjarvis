import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PolicyEngine } from "@/jarvis/server/policy/PolicyEngine";
import { N8nWebhookAdapter } from "@/jarvis/server/adapters/N8nWebhookAdapter";
import {
  configState,
  healthUrl,
  idempotencyKey,
  isValidWorkflowPath,
  workflowTier,
  type N8nConfigState,
} from "@/server/n8n-rules";

/**
 * P8 brick 1 — the n8n connector: an ALLOWLIST of declared workflows, a
 * policy gate, real executions and honest outcomes.
 *
 * JARVIS never posts to an arbitrary n8n path: a workflow must be declared
 * here first (the allowlist the architecture promised), and CRITICAL ones
 * — payment, publish, delete, production, legal — refuse to run without an
 * explicit human approval, exactly like a CRITICAL device capability.
 *
 * Plug-in day: set N8N_WEBHOOK_BASE_URL, N8N_BASE_URL and
 * N8N_JARVIS_SECRET, declare a workflow, done. No code change.
 */

export interface N8nWorkflow {
  id: string;
  /** Human name — also what the policy engine reads to spot critical ops. */
  name: string;
  /** The n8n webhook path segment (never a full URL). */
  path: string;
  description: string;
  tier: "ACT" | "CRITICAL";
  policyReason: string;
  createdAt: string;
  lastRunAt: string | null;
  lastOutcome: string | null;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  at: string;
  ok: boolean;
  detail: string;
  approvedBy?: string;
}

interface N8nFile {
  workflows: N8nWorkflow[];
  executions: N8nExecution[];
}

const EXECUTION_CAP = 200;
const policy = new PolicyEngine();

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "n8n-workflows.json");
}

function load(): N8nFile {
  const f = dataFile();
  if (!existsSync(f)) return { workflows: [], executions: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as N8nFile;
  } catch {
    return { workflows: [], executions: [] };
  }
}

function save(state: N8nFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function n8nConfig(): N8nConfigState {
  // Read the three variables explicitly: Next's typed ProcessEnv has no
  // index signature, and being explicit documents the whole contract.
  return configState({
    N8N_WEBHOOK_BASE_URL: process.env.N8N_WEBHOOK_BASE_URL,
    N8N_BASE_URL: process.env.N8N_BASE_URL,
    N8N_JARVIS_SECRET: process.env.N8N_JARVIS_SECRET,
  });
}

export function listWorkflows(): N8nWorkflow[] {
  return load().workflows;
}

export function listExecutions(): N8nExecution[] {
  return load().executions;
}

/** Declare a workflow — the only way it becomes callable. */
export function registerWorkflow(input: {
  name: string;
  path: string;
  description?: string;
}): N8nWorkflow | { error: string; status: number } {
  const name = input.name.trim();
  const path = input.path.trim();
  if (!name || !path) return { error: "name et path requis", status: 400 };
  if (!isValidWorkflowPath(path)) {
    return {
      error: "chemin de workflow invalide — segment [a-zA-Z0-9_-] attendu, jamais une URL",
      status: 400,
    };
  }
  const state = load();
  if (state.workflows.some((w) => w.path === path)) {
    return { error: "ce chemin est déjà déclaré", status: 409 };
  }
  const decision = policy.decideWorkflow(name);
  const workflow: N8nWorkflow = {
    id: randomUUID(),
    name,
    path,
    description: (input.description || "").trim(),
    tier: workflowTier(decision.requireApproval),
    policyReason: decision.reason,
    createdAt: new Date().toISOString(),
    lastRunAt: null,
    lastOutcome: null,
  };
  state.workflows.push(workflow);
  save(state);
  return workflow;
}

export function removeWorkflow(id: string): boolean {
  const state = load();
  const before = state.workflows.length;
  state.workflows = state.workflows.filter((w) => w.id !== id);
  save(state);
  return state.workflows.length < before;
}

function record(
  workflowId: string,
  ok: boolean,
  detail: string,
  approvedBy?: string
): void {
  const state = load();
  const workflow = state.workflows.find((w) => w.id === workflowId);
  const at = new Date().toISOString();
  if (workflow) {
    workflow.lastRunAt = at;
    workflow.lastOutcome = detail;
  }
  state.executions.unshift({ id: randomUUID(), workflowId, at, ok, detail, approvedBy });
  state.executions = state.executions.slice(0, EXECUTION_CAP);
  save(state);
}

/**
 * Run a declared workflow for real. Returns the n8n response, or an honest
 * failure — a workflow that did not run is never reported as done.
 */
export async function triggerWorkflow(
  id: string,
  input: Record<string, unknown>,
  approvedBy?: string
): Promise<{ workflow: N8nWorkflow; response: unknown } | { error: string; status: number; requiresApproval?: boolean }> {
  const config = n8nConfig();
  if (!config.canTrigger) {
    return {
      error: "n8n non configuré — N8N_WEBHOOK_BASE_URL absente",
      status: 503,
    };
  }
  const workflow = load().workflows.find((w) => w.id === id);
  if (!workflow) return { error: "workflow inconnu", status: 404 };

  if (workflow.tier === "CRITICAL" && !approvedBy) {
    return {
      error: `${workflow.policyReason} — approbation explicite requise`,
      status: 428,
      requiresApproval: true,
    };
  }

  const adapter = new N8nWebhookAdapter();
  const at = new Date().toISOString();
  try {
    const response = await adapter.trigger({
      workflow: workflow.path,
      input,
      idempotencyKey: idempotencyKey(workflow.id, at),
    });
    record(workflow.id, true, "exécuté", approvedBy);
    return { workflow, response };
  } catch (e) {
    const detail = `échec : ${e instanceof Error ? e.message : String(e)}`;
    record(workflow.id, false, detail, approvedBy);
    return { error: detail, status: 502 };
  }
}

/**
 * Real reachability probe — n8n exposes /healthz. Without N8N_BASE_URL we
 * say "not configured", never a fabricated verdict.
 */
export async function n8nHealth(): Promise<{
  status: "connected" | "unreachable" | "not_configured";
}> {
  const base = (process.env.N8N_BASE_URL || "").trim();
  if (!base) return { status: "not_configured" };
  try {
    const r = await fetch(healthUrl(base), {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return { status: r.ok ? "connected" : "unreachable" };
  } catch {
    return { status: "unreachable" };
  }
}
