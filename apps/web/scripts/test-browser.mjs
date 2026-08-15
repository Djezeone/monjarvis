#!/usr/bin/env node
/**
 * Unit cases for the pure browser-worker rules. Usage: npm run test:browser
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      normalizeDomain,
      isValidDomain,
      domainAllowed,
      rejectedDomains,
      clampSteps,
      configState,
      browserTaskDecision,
    } from ${JSON.stringify(join(here, "../src/server/browser-rules.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("schéma, chemin et port retirés",
      normalizeDomain("HTTPS://Exemple.FR:8443/page?x=1"), "exemple.fr");
    check("domaine valide", isValidDomain("exemple.fr"), true);
    check("hôte sans point refusé", isValidDomain("localhost"), false);
    check("underscore refusé", isValidDomain("mon_site.fr"), false);

    const allow = ["exemple.fr", "docs.python.org"];
    check("correspondance exacte", domainAllowed("exemple.fr", allow), true);
    check("sous-domaine accepté", domainAllowed("blog.exemple.fr", allow), true);
    check("suffixe trompeur refusé", domainAllowed("notexemple.fr", allow), false);
    check("domaine voisin refusé", domainAllowed("python.org", allow), false);
    check("les intrus sont listés",
      rejectedDomains(["exemple.fr", "evil.com", "blog.exemple.fr"], allow), ["evil.com"]);

    check("pas de plafond dépassé", clampSteps(50, 12), 12);
    check("valeur demandée respectée sous le plafond", clampSteps(4, 12), 4);
    check("absence de valeur → prudence", clampSteps(undefined, 12), 3);
    check("valeur absurde → prudence", clampSteps(0, 12), 3);

    check("éteint tant qu'il n'est pas activé explicitement",
      configState({ JARVIS_BROWSER_WORKER_URL: "http://x", JARVIS_BROWSER_WORKER_TOKEN: "t" }).enabled, false);
    check("activé mais non configuré",
      configState({ JARVIS_BROWSER_ENABLED: "1" }).configured, false);
    check("activé et configuré : plus rien ne manque",
      configState({ JARVIS_BROWSER_ENABLED: "1", JARVIS_BROWSER_WORKER_URL: "http://x", JARVIS_BROWSER_WORKER_TOKEN: "t" }).missing, []);

    check("un seul tier, toujours critique",
      { tier: browserTaskDecision().tier, approval: browserTaskDecision().requireApproval },
      { tier: "CRITICAL", approval: true });

    console.log((17 - failed) + "/17 cas navigateur passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
