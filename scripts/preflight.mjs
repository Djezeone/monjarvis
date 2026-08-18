#!/usr/bin/env node
/**
 * JARVIS X2 — préflight du Core.
 *
 * Répond à une seule question, avant de démarrer quoi que ce soit : « qu'est-ce
 * qui est configuré, qu'est-ce qui manque, et qu'est-ce que ça coûte ? »
 *
 * Chaque manque est accompagné de sa CONSÉQUENCE réelle — jamais d'un simple
 * « missing ». Et rien n'est deviné : avec --probe, les services déclarés sont
 * réellement interrogés ; sans, le rapport dit « non vérifié » plutôt que
 * d'inventer un verdict.
 *
 *   node scripts/preflight.mjs                     # lit apps/web/.env.local
 *   node scripts/preflight.mjs --env chemin/.env   # un autre fichier
 *   node scripts/preflight.mjs --probe             # interroge les services
 *   node scripts/preflight.mjs --json              # sortie machine
 *
 * Code de sortie : 1 si un BLOQUANT manque, 0 sinon.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const optionOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const envPath = resolve(optionOf("--env") || join(here, "../apps/web/.env.local"));
const PROBE = flag("--probe");
const JSON_OUT = flag("--json");

/** Lecture .env minimale : KEY=VALUE, # commentaires, guillemets optionnels. */
function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = readEnvFile(envPath);
// Les variables déjà présentes dans l'environnement priment : c'est ce que
// fera systemd, et le préflight doit refléter le démarrage réel.
const env = { ...(fileEnv || {}), ...process.env };
const val = (key) => String(env[key] ?? "").trim();

/**
 * Une couche = des variables, une conséquence en cas d'absence, et
 * éventuellement une sonde HTTP réelle.
 */
const LAYERS = [
  {
    name: "Rôle et données",
    checks: [
      {
        key: "JARVIS_ROLE",
        blocking: false,
        expect: (v) => v === "core" || v === "",
        consequence:
          "rôle non explicite — reste « core » hors Vercel, mais autant l'affirmer",
      },
      {
        key: "JARVIS_DATA_DIR",
        blocking: false,
        consequence:
          "les registres iront dans ./data à côté de l'app — pensez à la sauvegarde",
      },
    ],
  },
  {
    name: "Intelligence (Hermes, mémoire)",
    checks: [
      {
        key: "HERMES_API_URL",
        blocking: true,
        consequence: "aucun run possible — le cockpit répond 503 à toute demande",
        probe: (v) => `${v.replace(/\/$/, "")}/health`,
      },
      {
        key: "HERMES_API_KEY",
        blocking: true,
        secret: true,
        consequence: "Hermes refusera les appels du Core",
      },
      {
        key: "GRAPHITI_MEMORY_URL",
        blocking: false,
        consequence: "l'organe mémoire se déclarera non configuré ; le reste fonctionne",
        probe: (v) => `${v.replace(/\/$/, "")}/health`,
      },
    ],
  },
  {
    name: "Façade et sécurité",
    checks: [
      {
        key: "JARVIS_AUTH_SECRET",
        blocking: false,
        secret: true,
        expect: (v) => v === "" || v.length >= 24,
        consequence:
          "absent = mode local ouvert (réseau maîtrisé uniquement) ; présent mais < 24 caractères = la façade REFUSE TOUT LE MONDE",
      },
      {
        key: "JARVIS_TRUSTED_ORIGINS",
        blocking: false,
        consequence:
          "une façade distante recevra 403 sur chaque écriture (garde d'origine P9)",
      },
    ],
  },
  {
    name: "Notifications push",
    checks: [
      {
        key: "JARVIS_VAPID_PUBLIC_KEY",
        blocking: false,
        consequence: "aucune notification poussée — le panneau le dira",
      },
      { key: "JARVIS_VAPID_PRIVATE_KEY", blocking: false, secret: true, consequence: "idem" },
    ],
  },
  {
    name: "Connecteur n8n",
    checks: [
      {
        key: "N8N_BASE_URL",
        blocking: false,
        consequence: "la santé de l'instance ne pourra pas être vérifiée",
        probe: (v) => `${v.replace(/\/$/, "")}/healthz`,
      },
      {
        key: "N8N_WEBHOOK_BASE_URL",
        blocking: false,
        consequence: "aucun workflow ne pourra être déclenché",
      },
      {
        key: "N8N_JARVIS_SECRET",
        blocking: false,
        secret: true,
        consequence: "n8n ne pourra pas authentifier JARVIS",
      },
    ],
  },
  {
    name: "Connecteur Home Assistant",
    checks: [
      {
        key: "HASS_URL",
        blocking: false,
        consequence: "aucune instance à interroger",
        probe: (v) => `${v.replace(/\/$/, "")}/api/`,
      },
      {
        key: "HASS_TOKEN",
        blocking: false,
        secret: true,
        consequence: "Home Assistant refusera toute lecture et toute action",
      },
    ],
  },
  {
    name: "Navigateur agentique (éteint par défaut)",
    checks: [
      {
        key: "JARVIS_BROWSER_ENABLED",
        blocking: false,
        consequence: "worker éteint — c'est le comportement voulu tant que non demandé",
      },
      {
        key: "JARVIS_BROWSER_WORKER_TOKEN",
        blocking: false,
        secret: true,
        consequence: "le worker refuserait la requête",
      },
    ],
  },
];

async function probe(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    // Toute réponse HTTP < 500 prouve que quelque chose écoute et répond :
    // un service protégé répond légitimement 401 à une sonde sans jeton.
    return { reachable: r.status < 500, status: r.status };
  } catch (e) {
    return { reachable: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const report = { envPath, envFileFound: fileEnv !== null, probed: PROBE, layers: [] };
let blockingMissing = 0;
let warnings = 0;

for (const layer of LAYERS) {
  const entry = { name: layer.name, checks: [] };
  for (const check of layer.checks) {
    const value = val(check.key);
    const present = value !== "";
    const valid = check.expect ? check.expect(value) : true;
    const state = !present
      ? check.blocking
        ? "bloquant"
        : "absent"
      : valid
        ? "ok"
        : "invalide";
    if (state === "bloquant") blockingMissing++;
    if (state === "absent" || state === "invalide") warnings++;

    const result = {
      key: check.key,
      state,
      value: check.secret ? (present ? "défini" : "") : value,
      consequence: state === "ok" ? "" : check.consequence,
    };
    if (PROBE && present && valid && check.probe) {
      result.probe = await probe(check.probe(value));
    } else if (present && check.probe) {
      result.probe = { reachable: null, note: "non vérifié (utilisez --probe)" };
    }
    entry.checks.push(result);
  }
  report.layers.push(entry);
}

if (JSON_OUT) {
  console.log(JSON.stringify({ ...report, blockingMissing, warnings }, null, 2));
  process.exit(blockingMissing ? 1 : 0);
}

const MARK = { ok: "✓", absent: "·", invalide: "✗", bloquant: "✗" };
console.log(`\nJARVIS X2 — préflight du Core`);
console.log(
  fileEnv === null
    ? `  fichier ${envPath} introuvable — lecture de l'environnement seul`
    : `  fichier ${envPath}`
);
console.log(PROBE ? "  sondes réseau : actives\n" : "  sondes réseau : désactivées (--probe)\n");

for (const layer of report.layers) {
  console.log(`  ${layer.name}`);
  for (const c of layer.checks) {
    const shown = c.state === "ok" ? c.value || "défini" : "—";
    let line = `    ${MARK[c.state]} ${c.key.padEnd(28)} ${shown}`;
    if (c.probe && c.probe.reachable === true) line += `  [répond ${c.probe.status}]`;
    if (c.probe && c.probe.reachable === false) line += `  [INJOIGNABLE]`;
    console.log(line);
    if (c.consequence) console.log(`      → ${c.consequence}`);
  }
  console.log("");
}

console.log(
  blockingMissing
    ? `  ${blockingMissing} variable(s) BLOQUANTE(S) manquante(s) — JARVIS ne pourra pas raisonner.\n`
    : `  Aucun bloquant. ${warnings} organe(s) optionnel(s) non configuré(s) — chacun le dira lui-même.\n`
);
process.exit(blockingMissing ? 1 : 0);
