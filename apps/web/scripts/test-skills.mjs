#!/usr/bin/env node
/**
 * Unit cases for the pure skill-learning rules. Usage: npm run test:skills
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      repeatedProcedureCandidates,
      normalizeInput,
    } from ${JSON.stringify(join(here, "../src/server/skill-rules.ts"))};

    const now = new Date("2026-08-14T12:00:00");
    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };
    const OPTS = { minRepeats: 3, windowDays: 14 };
    const ev = (input, session, device = "bureau", day = 14) => ({
      input, sessionKey: session, device,
      at: new Date("2026-08-" + String(day).padStart(2, "0") + "T09:30:00").toISOString(),
    });
    const PROMPT = "résume mes mails du matin";

    check("3 occurrences, 2 sessions → candidat",
      repeatedProcedureCandidates([ev(PROMPT, "s1"), ev(PROMPT, "s1"), ev(PROMPT, "s2")], now, OPTS)
        .map(c => c.prompt), [PROMPT]);
    check("2 occurrences → rien",
      repeatedProcedureCandidates([ev(PROMPT, "s1"), ev(PROMPT, "s2")], now, OPTS), []);
    check("3 occurrences mais une seule session → rien",
      repeatedProcedureCandidates([ev(PROMPT, "s1"), ev(PROMPT, "s1"), ev(PROMPT, "s1")], now, OPTS), []);
    check("casse et espaces regroupés",
      repeatedProcedureCandidates(
        [ev("Résume MES mails  du matin", "s1"), ev(PROMPT, "s2"), ev(PROMPT + "  ", "s3")], now, OPTS
      ).length, 1);
    check("normalisation stable",
      normalizeInput("  Résume   MES mails du matin "), "résume mes mails du matin");
    check("runs de routines et de skills exclus",
      repeatedProcedureCandidates(
        [ev(PROMPT, "s1", "routine:matin"), ev(PROMPT, "s2", "skill:x"), ev(PROMPT, "s3")], now, OPTS
      ), []);
    check("entrées trop courtes exclues",
      repeatedProcedureCandidates([ev("ok merci", "s1"), ev("ok merci", "s2"), ev("ok merci", "s3")], now, OPTS), []);
    check("hors fenêtre 14 j exclu",
      repeatedProcedureCandidates(
        [ev(PROMPT, "s1", "bureau", 14), ev(PROMPT, "s2", "bureau", 14), ev(PROMPT, "s3", "bureau", 1)],
        new Date("2026-08-20T12:00:00"), { minRepeats: 3, windowDays: 5 }
      ), []);
    const long = "a".repeat(80) + " procédure très longue à nommer";
    const cLong = repeatedProcedureCandidates([ev(long, "s1"), ev(long, "s2"), ev(long, "s3")], now, OPTS)[0];
    check("nom tronqué à 60 caractères", cLong.name.length <= 60, true);
    check("provenance chiffrée",
      repeatedProcedureCandidates([ev(PROMPT, "s1"), ev(PROMPT, "s1"), ev(PROMPT, "s2")], now, OPTS)[0]
        .provenance[0].includes("3 occurrences dans 2 sessions"), true);

    console.log((10 - failed) + "/10 cas de règles passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
