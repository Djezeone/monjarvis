/**
 * P8 brick 2 — Home Assistant connector, pure rules.
 *
 * The physical world is where a mistake costs the most: an unlocked door
 * is not an undone tweet. So the allowlist here is stricter than n8n's —
 * JARVIS may only touch entities you declared, and the domains that guard
 * your home (locks, alarms) always demand an explicit approval, even when
 * declared.
 *
 * Pure module: no filesystem, no network, directly unit-testable.
 */

/** Home Assistant entity ids are `domain.object_id`, both snake_case. */
export const ENTITY_RE = /^[a-z_]{2,40}\.[a-z0-9_]{1,60}$/;
export const SERVICE_RE = /^[a-z0-9_]{1,40}$/;

export function isValidEntityId(entityId: string): boolean {
  return ENTITY_RE.test(entityId);
}

export function isValidService(service: string): boolean {
  return SERVICE_RE.test(service);
}

export function entityDomain(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

/**
 * Domains that can compromise the physical safety of the home. Declaring
 * them is allowed; acting on them without an explicit approval is not.
 */
const GUARDED_DOMAINS = new Set(["lock", "alarm_control_panel", "cover", "climate"]);

/** Services whose effect is hard to undo or safety-relevant. */
const GUARDED_SERVICES = /^(unlock|disarm|open|delete|remove|set_temperature)$/;

export interface HomeDecision {
  tier: "READ" | "ACT" | "CRITICAL";
  requireApproval: boolean;
  reason: string;
}

/**
 * Risk of calling `service` on an entity. Read-only intents stay READ; the
 * guarded domains and services demand a human.
 */
export function decideHomeCall(entityId: string, service: string): HomeDecision {
  const domain = entityDomain(entityId);
  if (GUARDED_DOMAINS.has(domain)) {
    return {
      tier: "CRITICAL",
      requireApproval: true,
      reason: `Le domaine « ${domain} » touche à la sécurité physique du logement.`,
    };
  }
  if (GUARDED_SERVICES.test(service)) {
    return {
      tier: "CRITICAL",
      requireApproval: true,
      reason: `Le service « ${service} » est difficilement réversible.`,
    };
  }
  return {
    tier: "ACT",
    requireApproval: false,
    reason: "Action domotique réversible (tier ACT).",
  };
}

export interface HomeConfigState {
  canRead: boolean;
  canAct: boolean;
  missing: string[];
}

export function configState(env: { HASS_URL?: string; HASS_TOKEN?: string }): HomeConfigState {
  const url = (env.HASS_URL || "").trim();
  const token = (env.HASS_TOKEN || "").trim();
  const missing: string[] = [];
  if (!url) missing.push("HASS_URL — sans elle, aucune instance à interroger");
  if (!token)
    missing.push("HASS_TOKEN — sans lui, Home Assistant refuse toute lecture et toute action");
  const ready = Boolean(url && token);
  return { canRead: ready, canAct: ready, missing };
}
