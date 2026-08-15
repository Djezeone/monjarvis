#!/usr/bin/env node
/**
 * Unit cases for the proactivity hierarchy. Usage: npm run test:proactivity
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      LEVELS,
      channelForLevel,
      modalityForChannel,
      deliveryThreshold,
      shouldDeliver,
      deliveryCapPerHour,
      explain,
    } from ${JSON.stringify(join(here, "../src/server/proactivity.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("cinq degrés, du plus discret au plus fort",
      LEVELS, ["silent", "info", "useful", "important", "critical"]);
    check("canaux par niveau",
      LEVELS.map(channelForLevel),
      ["journal", "journal", "notification", "interruption", "approval"]);
    check("une interruption parle, une notification non",
      [modalityForChannel("interruption"), modalityForChannel("notification")],
      ["voice", "notification"]);
    check("journal et approbation ne passent pas par le routeur",
      [modalityForChannel("journal"), modalityForChannel("approval")], [null, null]);

    check("seuils", ["off", "low", "normal"].map(deliveryThreshold),
      [null, "important", "useful"]);
    check("off : rien n'est livré",
      LEVELS.map(l => shouldDeliver(l, "off")), [false, false, false, false, false]);
    check("low : seulement important",
      LEVELS.map(l => shouldDeliver(l, "low")), [false, false, false, true, false]);
    check("normal : utile et au-dessus",
      LEVELS.map(l => shouldDeliver(l, "normal")), [false, false, true, true, false]);
    check("CRITICAL n'est jamais livré : il attend une décision",
      shouldDeliver("critical", "normal"), false);

    check("plafonds horaires", ["off", "low", "normal"].map(deliveryCapPerHour), [0, 1, 4]);

    check("explication : sous le seuil, on dit pourquoi",
      explain("useful", "low").includes("sous le seuil"), true);
    check("explication : proactivité désactivée",
      explain("useful", "off"), "journalisée — proactivité désactivée");
    check("explication : interruption annoncée",
      explain("important", "low"), "interruption — annoncée à voix haute");
    check("explication : critique renvoie au garde-fou FR-009",
      explain("critical", "normal").includes("FR-009"), true);

    console.log((14 - failed) + "/14 cas de proactivité passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
