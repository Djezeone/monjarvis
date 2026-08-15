import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { BrowserWorkerAdapter } from "@/jarvis/server/adapters/BrowserWorkerAdapter";
import {
  browserTaskDecision,
  clampSteps,
  configState,
  isValidDomain,
  normalizeDomain,
  rejectedDomains,
  type BrowserConfigState,
} from "@/server/browser-rules";

/**
 * P8 brick 3 — the browser worker connector. Off by default, allowlisted
 * by domain, always approved, and bounded in steps.
 *
 * Note on health: unlike n8n (/healthz) and Home Assistant (/api/), the
 * worker has no documented health contract. Rather than invent an endpoint
 * and report a fabricated verdict, this connector reports its
 * CONFIGURATION state only — the honest thing to say about a component
 * whose contract we do not own.
 */

export interface BrowserDomain {
  id: string;
  domain: string;
  createdAt: string;
}

export interface BrowserExecution {
  id: string;
  at: string;
  task: string;
  domains: string[];
  steps: number;
  ok: boolean;
  detail: string;
  approvedBy: string;
}

interface BrowserFile {
  domains: BrowserDomain[];
  executions: BrowserExecution[];
}

const EXECUTION_CAP = 100;
const STEP_CEILING = Number(process.env.JARVIS_BROWSER_MAX_STEPS || 12);

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "browser-domains.json");
}

function load(): BrowserFile {
  const f = dataFile();
  if (!existsSync(f)) return { domains: [], executions: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as BrowserFile;
  } catch {
    return { domains: [], executions: [] };
  }
}

function save(state: BrowserFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function browserConfig(): BrowserConfigState {
  return configState({
    JARVIS_BROWSER_ENABLED: process.env.JARVIS_BROWSER_ENABLED,
    JARVIS_BROWSER_WORKER_URL: process.env.JARVIS_BROWSER_WORKER_URL,
    JARVIS_BROWSER_WORKER_TOKEN: process.env.JARVIS_BROWSER_WORKER_TOKEN,
  });
}

export function listDomains(): BrowserDomain[] {
  return load().domains;
}

export function listBrowserExecutions(): BrowserExecution[] {
  return load().executions;
}

export function stepCeiling(): number {
  return STEP_CEILING;
}

export function registerDomain(
  input: string
): BrowserDomain | { error: string; status: number } {
  const domain = normalizeDomain(input);
  if (!isValidDomain(domain)) {
    return { error: "domaine invalide — nom d'hôte attendu, sans schéma ni chemin", status: 400 };
  }
  const state = load();
  if (state.domains.some((d) => d.domain === domain)) {
    return { error: "domaine déjà déclaré", status: 409 };
  }
  const record: BrowserDomain = {
    id: randomUUID(),
    domain,
    createdAt: new Date().toISOString(),
  };
  state.domains.push(record);
  save(state);
  return record;
}

export function removeDomain(id: string): boolean {
  const state = load();
  const before = state.domains.length;
  state.domains = state.domains.filter((d) => d.id !== id);
  save(state);
  return state.domains.length < before;
}

/**
 * Run a browser task. Refuses — in this order — when the worker is off,
 * unconfigured, aimed at an undeclared domain, or unapproved. Nothing
 * reaches the worker before all four checks pass.
 */
export async function runBrowserTask(input: {
  task: string;
  domains: string[];
  maxSteps?: number;
  approvedBy?: string;
}): Promise<
  | { taskId: unknown; steps: number; domains: string[] }
  | { error: string; status: number; requiresApproval?: boolean }
> {
  const config = browserConfig();
  if (!config.enabled) {
    return { error: "navigateur désactivé — JARVIS_BROWSER_ENABLED=1 requis", status: 503 };
  }
  if (!config.configured) {
    return { error: "worker navigateur non configuré (URL ou jeton absent)", status: 503 };
  }

  const task = input.task.trim();
  if (!task) return { error: "tâche vide", status: 400 };
  const domains = (input.domains || []).map(normalizeDomain).filter(Boolean);
  if (domains.length === 0) {
    return { error: "une tâche doit déclarer les domaines qu'elle visite", status: 400 };
  }

  const allowlist = listDomains().map((d) => d.domain);
  const rejected = rejectedDomains(domains, allowlist);
  if (rejected.length > 0) {
    return { error: `domaines non déclarés : ${rejected.join(", ")}`, status: 403 };
  }

  const decision = browserTaskDecision();
  if (!input.approvedBy) {
    return { error: `${decision.reason} Approbation explicite requise.`, status: 428, requiresApproval: true };
  }

  const steps = clampSteps(input.maxSteps, STEP_CEILING);
  const state = load();
  const at = new Date().toISOString();
  try {
    const response = (await new BrowserWorkerAdapter().run({
      task,
      allowedDomains: domains,
      maxSteps: steps,
    })) as { id?: unknown };
    state.executions.unshift({
      id: randomUUID(),
      at,
      task,
      domains,
      steps,
      ok: true,
      detail: "lancée",
      approvedBy: input.approvedBy,
    });
    state.executions = state.executions.slice(0, EXECUTION_CAP);
    save(state);
    return { taskId: response?.id ?? null, steps, domains };
  } catch (e) {
    const detail = `échec : ${e instanceof Error ? e.message : String(e)}`;
    state.executions.unshift({
      id: randomUUID(),
      at,
      task,
      domains,
      steps,
      ok: false,
      detail,
      approvedBy: input.approvedBy,
    });
    state.executions = state.executions.slice(0, EXECUTION_CAP);
    save(state);
    return { error: detail, status: 502 };
  }
}
