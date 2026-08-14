#!/usr/bin/env node
/**
 * Unit cases for the pure routine due-time logic. Usage: npm run test:routines
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const CASES = [
  // interval: first run is always due
  { s: { kind: "interval", minutes: 30 }, last: null, now: "2026-08-14T10:00:00", expect: true },
  // interval: not yet elapsed
  { s: { kind: "interval", minutes: 30 }, last: "2026-08-14T09:45:00", now: "2026-08-14T10:00:00", expect: false },
  // interval: elapsed
  { s: { kind: "interval", minutes: 30 }, last: "2026-08-14T09:29:00", now: "2026-08-14T10:00:00", expect: true },
  // daily: before today's slot
  { s: { kind: "daily", time: "08:00" }, last: null, now: "2026-08-14T07:59:00", expect: false },
  // daily: after slot, never run
  { s: { kind: "daily", time: "08:00" }, last: null, now: "2026-08-14T08:01:00", expect: true },
  // daily: after slot, already ran after the slot today
  { s: { kind: "daily", time: "08:00" }, last: "2026-08-14T08:02:00", now: "2026-08-14T12:00:00", expect: false },
  // daily: ran yesterday, past today's slot again
  { s: { kind: "daily", time: "08:00" }, last: "2026-08-13T08:02:00", now: "2026-08-14T08:05:00", expect: true },
  // daily: ran yesterday, before today's slot
  { s: { kind: "daily", time: "08:00" }, last: "2026-08-13T08:02:00", now: "2026-08-14T07:00:00", expect: false },
];

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import { isRoutineDue } from ${JSON.stringify(join(here, "../src/server/routine-due.ts"))};
    const cases = ${JSON.stringify(CASES)};
    let failed = 0;
    for (const c of cases) {
      const got = isRoutineDue({ schedule: c.s, lastRunAt: c.last }, new Date(c.now));
      if (got !== c.expect) {
        failed++;
        console.error("FAIL", JSON.stringify(c.s), "last:", c.last, "now:", c.now, "→", got, "(attendu", c.expect + ")");
      }
    }
    console.log(cases.length - failed + "/" + cases.length + " cas d'échéance passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
