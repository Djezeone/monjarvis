#!/usr/bin/env node
/**
 * Unit cases for the pure Home Assistant rules. Usage: npm run test:home
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      isValidEntityId,
      isValidService,
      entityDomain,
      decideHomeCall,
      configState,
    } from ${JSON.stringify(join(here, "../src/server/home-rules.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("entité valide", isValidEntityId("light.salon"), true);
    check("sans domaine → refusée", isValidEntityId("salon"), false);
    check("majuscules refusées", isValidEntityId("Light.Salon"), false);
    check("injection de chemin refusée", isValidEntityId("light.salon/../../etc"), false);
    check("service valide", isValidService("turn_on"), true);
    check("service avec espace refusé", isValidService("turn on"), false);
    check("domaine extrait", entityDomain("switch.cafetiere"), "switch");

    check("allumer une lampe reste réversible",
      decideHomeCall("light.salon", "turn_on"),
      { tier: "ACT", requireApproval: false, reason: "Action domotique réversible (tier ACT)." });
    check("une serrure demande toujours un humain",
      decideHomeCall("lock.entree", "lock").requireApproval, true);
    check("même pour verrouiller — le domaine suffit",
      decideHomeCall("lock.entree", "lock").tier, "CRITICAL");
    check("une alarme aussi",
      decideHomeCall("alarm_control_panel.maison", "alarm_arm_home").requireApproval, true);
    check("un service irréversible sur un domaine banal reste critique",
      decideHomeCall("switch.prise", "delete").requireApproval, true);

    check("rien de configuré : les deux variables sont nommées",
      configState({}).missing.length, 2);
    check("URL seule ne suffit pas",
      configState({ HASS_URL: "http://x" }).canRead, false);
    check("URL et jeton : prêt",
      configState({ HASS_URL: "http://x", HASS_TOKEN: "t" }),
      { canRead: true, canAct: true, missing: [] });

    console.log((15 - failed) + "/15 cas maison passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
