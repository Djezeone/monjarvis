#!/usr/bin/env node
/**
 * Unit cases for the login hardening. Usage: npm run test:login
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      MIN_SECRET_LENGTH,
      secretStrength,
      slowSecretEqual,
      checkAttempts,
      recordFailure,
      clearAttempts,
    } from ${JSON.stringify(join(here, "../src/server/login-guard.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    check("plancher d'entropie", MIN_SECRET_LENGTH, 24);
    check("secret trop court refusé", secretStrength("court").ok, false);
    check("le refus dit la longueur trouvée",
      secretStrength("court").reason.includes("5 caractères"), true);
    check("secret long mais devinable refusé",
      secretStrength("password-tres-tres-tres-long").ok, false);
    check("« jarvis… » refusé", secretStrength("jarvis-de-la-maison-2026-ok").ok, false);
    check("caractère répété refusé", secretStrength("aaaaaaaaaaaaaaaaaaaaaaaaaa").ok, false);
    check("secret solide accepté", secretStrength("e2e-Ph4se-Jarvis-X2-Secret-2026").ok, true);

    check("dérivation lente : égalité vraie",
      await slowSecretEqual("un-secret-tres-long-et-solide", "un-secret-tres-long-et-solide"), true);
    check("dérivation lente : un caractère change tout",
      await slowSecretEqual("un-secret-tres-long-et-solide", "un-secret-tres-long-et-solidf"), false);

    const now = 1_800_000_000_000;
    let state = {};
    check("première tentative autorisée", checkAttempts(state, "ip", now).blocked, false);
    for (let i = 0; i < 10; i++) state = recordFailure(state, "ip", now);
    const blocked = checkAttempts(state, "ip", now);
    check("dix échecs → bloqué", blocked.blocked, true);
    check("le blocage annonce un délai", blocked.retryAfterSeconds > 0, true);
    check("une autre IP n'est pas punie", checkAttempts(state, "autre-ip", now).blocked, false);
    check("la fenêtre expire",
      checkAttempts(state, "ip", now + 15 * 60_000 + 1).blocked, false);
    check("un succès remet le compteur à zéro",
      checkAttempts(clearAttempts(state, "ip"), "ip", now).blocked, false);

    console.log((15 - failed) + "/15 cas de login passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
