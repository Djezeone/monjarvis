#!/usr/bin/env node
/**
 * Unit cases for the origin guard. Usage: npm run test:origin
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      isStateChanging,
      trustedOrigins,
      originAllowed,
    } from ${JSON.stringify(join(here, "../src/server/origin-guard.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("lecture non gardée", ["GET", "HEAD", "OPTIONS"].map(isStateChanging), [false, false, false]);
    check("écritures gardées", ["POST", "PUT", "DELETE", "PATCH"].map(isStateChanging), [true, true, true, true]);
    check("méthode en minuscules reconnue", isStateChanging("post"), true);

    const host = "127.0.0.1:3000";
    const none = [];
    check("sans Origin (agent, curl) → laissé passer",
      originAllowed({ origin: null, host, trusted: none }), true);
    check("même origine → autorisée",
      originAllowed({ origin: "http://127.0.0.1:3000", host, trusted: none }), true);
    check("site tiers → REFUSÉ",
      originAllowed({ origin: "https://evil.example", host, trusted: none }), false);
    check("port différent → refusé (autre origine)",
      originAllowed({ origin: "http://127.0.0.1:4000", host, trusted: none }), false);
    check("Origin \\"null\\" (iframe bac à sable) → refusé",
      originAllowed({ origin: "null", host, trusted: none }), false);
    check("Origin illisible → refusé",
      originAllowed({ origin: "pas-une-url", host, trusted: none }), false);

    const trusted = trustedOrigins("https://jarvis-x2.vercel.app/ , http://127.0.0.1:3102");
    check("liste de confiance nettoyée",
      trusted, ["https://jarvis-x2.vercel.app", "http://127.0.0.1:3102"]);
    check("façade déclarée → autorisée",
      originAllowed({ origin: "https://jarvis-x2.vercel.app", host, trusted }), true);
    check("façade déclarée avec chemin → autorisée par l'hôte",
      originAllowed({ origin: "https://jarvis-x2.vercel.app", host: "core.local", trusted }), true);
    check("voisin non déclaré → toujours refusé",
      originAllowed({ origin: "https://jarvis-x2.vercel.app.evil.com", host, trusted }), false);
    check("liste vide bien parsée", trustedOrigins(undefined), []);

    console.log((14 - failed) + "/14 cas de garde d'origine passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
