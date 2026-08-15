#!/usr/bin/env node
/**
 * Unit cases for the pure n8n connector rules. Usage: npm run test:n8n
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      isValidWorkflowPath,
      webhookUrl,
      healthUrl,
      configState,
      workflowTier,
      idempotencyKey,
    } from ${JSON.stringify(join(here, "../src/server/n8n-rules.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("chemin simple accepté", isValidWorkflowPath("resume-du-matin"), true);
    check("URL complète refusée", isValidWorkflowPath("http://evil/x"), false);
    check("traversée de chemin refusée", isValidWorkflowPath("../../secret"), false);
    check("chemin vide refusé", isValidWorkflowPath(""), false);
    check("chemin trop long refusé", isValidWorkflowPath("a".repeat(81)), false);

    check("URL webhook sans double slash",
      webhookUrl("http://127.0.0.1:5678/webhook/", "brief"), "http://127.0.0.1:5678/webhook/brief");
    check("URL de santé", healthUrl("http://127.0.0.1:5678"), "http://127.0.0.1:5678/healthz");

    check("rien de configuré : tout est nommé",
      configState({}),
      { canTrigger: false, canProbe: false, authenticated: false, missing: [
        "N8N_WEBHOOK_BASE_URL — sans elle, aucun workflow ne peut être déclenché",
        "N8N_BASE_URL — sans elle, la santé de l'instance ne peut pas être vérifiée",
        "N8N_JARVIS_SECRET — sans lui, n8n ne peut pas authentifier JARVIS",
      ]});
    check("webhook seul : on peut déclencher, pas sonder",
      configState({ N8N_WEBHOOK_BASE_URL: "http://x/webhook" }).canTrigger, true);
    check("tout configuré : plus rien ne manque",
      configState({
        N8N_WEBHOOK_BASE_URL: "http://x/webhook",
        N8N_BASE_URL: "http://x",
        N8N_JARVIS_SECRET: "s",
      }).missing, []);
    check("valeurs vides comptées comme absentes",
      configState({ N8N_WEBHOOK_BASE_URL: "   " }).canTrigger, false);

    check("tier ACT par défaut", workflowTier(false), "ACT");
    check("tier CRITICAL si approbation requise", workflowTier(true), "CRITICAL");

    check("clé d'idempotence stable",
      idempotencyKey("wf-1", "2026-08-15T10:00:00Z"), "jarvis-wf-1-2026-08-15T10:00:00Z");

    console.log((14 - failed) + "/14 cas n8n passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
