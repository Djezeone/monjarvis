#!/usr/bin/env node
/**
 * Unit cases for the pure learning rules. Usage: npm run test:learned
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      preferredDeviceCandidate,
      quietHoursCandidate,
    } from ${JSON.stringify(join(here, "../src/server/learned-rules.ts"))};

    const now = new Date("2026-08-14T12:00:00");
    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };
    const OPTS = { windowDays: 7, minRuns: 5, minShare: 0.6 };
    const at = (d, h) => new Date("2026-08-" + String(d).padStart(2, "0") + "T" + String(h).padStart(2, "0") + ":30:00").toISOString();
    const runs = (device, n, day = 14, hour = 9) =>
      Array.from({ length: n }, () => ({ device, at: at(day, hour) }));

    // preferred-device
    const dominant = [...runs("bureau", 6), ...runs("mobile", 2)];
    const c1 = preferredDeviceCandidate(dominant, "", now, OPTS);
    check("dominant → proposition bureau", c1?.proposal, { preferredDevice: "bureau" });
    check("provenance chiffrée", c1?.provenance[0].includes("6 runs sur 8"), true);
    check("part affichée", c1?.provenance[0].includes("75 %"), true);
    check("sous minRuns → rien",
      preferredDeviceCandidate([...runs("bureau", 4), ...runs("mobile", 1)], "", now, OPTS), null);
    check("part sous minShare → rien",
      preferredDeviceCandidate([...runs("bureau", 5), ...runs("mobile", 5)], "", now, OPTS), null);
    check("déjà la préférence → rien",
      preferredDeviceCandidate(dominant, "bureau", now, OPTS), null);
    check("hors fenêtre 7 j → rien",
      preferredDeviceCandidate(runs("bureau", 6, 1), "", now, OPTS), null);
    check("routines et inconnus exclus",
      preferredDeviceCandidate(
        [...runs("routine:matin", 9), ...runs("inconnu", 9), ...runs("bureau", 5)], "", now, OPTS
      )?.proposal, { preferredDevice: "bureau" });

    // quiet-hours : activité 08h–21h sur 6 jours → bloc calme 22:00 → 08:00
    const week = [];
    for (let d = 9; d <= 14; d++) for (let h = 8; h <= 21; h++) week.push({ device: "bureau", at: at(d, h) });
    const q1 = quietHoursCandidate(week, null, { minDays: 5, minGapHours: 6 });
    check("nuit vide → heures calmes 22:00-08:00", q1?.proposal, { quietHours: { start: "22:00", end: "08:00" } });
    check("provenance jours observés", q1?.provenance[0].includes("6 jours"), true);
    check("pas assez de jours → rien",
      quietHoursCandidate(week.filter(e => e.at < at(11, 0)), null, { minDays: 5, minGapHours: 6 }), null);
    check("heures calmes déjà définies → rien",
      quietHoursCandidate(week, { start: "23:00", end: "07:00" }, { minDays: 5, minGapHours: 6 }), null);
    check("trou trop court → rien",
      quietHoursCandidate(week, null, { minDays: 5, minGapHours: 12 }), null);

    console.log((13 - failed) + "/13 cas de règles passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
