import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { HomeAssistantAdapter } from "@/jarvis/server/adapters/HomeAssistantAdapter";
import {
  configState,
  decideHomeCall,
  isValidEntityId,
  isValidService,
  type HomeConfigState,
} from "@/server/home-rules";

/**
 * P8 brick 2 — the Home Assistant connector: an allowlist of entities, a
 * policy gate on the physical world, and traced executions.
 *
 * JARVIS can see your whole house through the API, but it may only touch
 * what you declared here. Guarded domains (locks, alarms, covers, climate)
 * refuse to act without an explicit approval — declaring them is not
 * consenting to them.
 *
 * Plug-in day: set HASS_URL and HASS_TOKEN, declare the entities. No code.
 */

export interface HomeEntity {
  id: string;
  entityId: string;
  label: string;
  createdAt: string;
  lastCallAt: string | null;
  lastOutcome: string | null;
}

export interface HomeExecution {
  id: string;
  entityId: string;
  service: string;
  at: string;
  ok: boolean;
  detail: string;
  approvedBy?: string;
}

interface HomeFile {
  entities: HomeEntity[];
  executions: HomeExecution[];
}

const EXECUTION_CAP = 200;

function dataFile(): string {
  const dir = process.env.JARVIS_DATA_DIR || join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return join(dir, "home-entities.json");
}

function load(): HomeFile {
  const f = dataFile();
  if (!existsSync(f)) return { entities: [], executions: [] };
  try {
    return JSON.parse(readFileSync(f, "utf8")) as HomeFile;
  } catch {
    return { entities: [], executions: [] };
  }
}

function save(state: HomeFile): void {
  writeFileSync(dataFile(), JSON.stringify(state, null, 2));
}

export function homeConfig(): HomeConfigState {
  return configState({ HASS_URL: process.env.HASS_URL, HASS_TOKEN: process.env.HASS_TOKEN });
}

export function listEntities(): HomeEntity[] {
  return load().entities;
}

export function listHomeExecutions(): HomeExecution[] {
  return load().executions;
}

/** Declare an entity — the only way JARVIS may ever touch it. */
export function registerEntity(input: {
  entityId: string;
  label?: string;
}): HomeEntity | { error: string; status: number } {
  const entityId = input.entityId.trim().toLowerCase();
  if (!isValidEntityId(entityId)) {
    return { error: "entity_id invalide — format domaine.objet attendu", status: 400 };
  }
  const state = load();
  if (state.entities.some((e) => e.entityId === entityId)) {
    return { error: "entité déjà déclarée", status: 409 };
  }
  const entity: HomeEntity = {
    id: randomUUID(),
    entityId,
    label: (input.label || entityId).trim(),
    createdAt: new Date().toISOString(),
    lastCallAt: null,
    lastOutcome: null,
  };
  state.entities.push(entity);
  save(state);
  return entity;
}

export function removeEntity(id: string): boolean {
  const state = load();
  const before = state.entities.length;
  state.entities = state.entities.filter((e) => e.id !== id);
  save(state);
  return state.entities.length < before;
}

function record(
  entityId: string,
  service: string,
  ok: boolean,
  detail: string,
  approvedBy?: string
): void {
  const state = load();
  const entity = state.entities.find((e) => e.entityId === entityId);
  const at = new Date().toISOString();
  if (entity) {
    entity.lastCallAt = at;
    entity.lastOutcome = detail;
  }
  state.executions.unshift({
    id: randomUUID(),
    entityId,
    service,
    at,
    ok,
    detail,
    approvedBy,
  });
  state.executions = state.executions.slice(0, EXECUTION_CAP);
  save(state);
}

/** Read one declared entity's real state. Never reads outside the allowlist. */
export async function readEntityState(
  entityId: string
): Promise<{ state: unknown } | { error: string; status: number }> {
  if (!homeConfig().canRead) {
    return { error: "Home Assistant non configuré", status: 503 };
  }
  if (!listEntities().some((e) => e.entityId === entityId)) {
    return { error: "entité non déclarée — hors allowlist", status: 403 };
  }
  try {
    return { state: await new HomeAssistantAdapter().state(entityId) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), status: 502 };
  }
}

/**
 * Call a service on a declared entity. Guarded domains and irreversible
 * services answer 428 until an explicit approval is attached.
 */
export async function callHomeService(input: {
  entityId: string;
  service: string;
  data?: Record<string, unknown>;
  approvedBy?: string;
}): Promise<
  | { entityId: string; service: string; tier: string; response: unknown }
  | { error: string; status: number; requiresApproval?: boolean }
> {
  const entityId = input.entityId.trim().toLowerCase();
  const service = input.service.trim().toLowerCase();
  if (!isValidEntityId(entityId) || !isValidService(service)) {
    return { error: "entity_id ou service invalide", status: 400 };
  }
  if (!homeConfig().canAct) {
    return { error: "Home Assistant non configuré", status: 503 };
  }
  if (!listEntities().some((e) => e.entityId === entityId)) {
    return { error: "entité non déclarée — hors allowlist", status: 403 };
  }

  const decision = decideHomeCall(entityId, service);
  if (decision.requireApproval && !input.approvedBy) {
    return {
      error: `${decision.reason} Approbation explicite requise.`,
      status: 428,
      requiresApproval: true,
    };
  }

  const domain = entityId.split(".")[0];
  try {
    const response = await new HomeAssistantAdapter().callService(domain, service, {
      entity_id: entityId,
      ...(input.data || {}),
    });
    record(entityId, service, true, `${service} exécuté`, input.approvedBy);
    return { entityId, service, tier: decision.tier, response };
  } catch (e) {
    const detail = `échec : ${e instanceof Error ? e.message : String(e)}`;
    record(entityId, service, false, detail, input.approvedBy);
    return { error: detail, status: 502 };
  }
}

/** Real reachability, or an honest "not configured". */
export async function homeHealth(): Promise<{
  status: "connected" | "unreachable" | "not_configured";
}> {
  if (!homeConfig().canRead) return { status: "not_configured" };
  try {
    return { status: (await new HomeAssistantAdapter().health()) ? "connected" : "unreachable" };
  } catch {
    return { status: "unreachable" };
  }
}
