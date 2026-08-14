#!/usr/bin/env node
/**
 * Unit cases for the façade pending queue. Usage: npm run test:queue
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      listPending,
      queueRun,
      removePending,
      PENDING_KEY,
    } from ${JSON.stringify(join(here, "../src/lib/pending-queue.ts"))};

    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };
    const memory = () => {
      const m = new Map();
      return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
    };

    const s = memory();
    check("vide au départ", listPending(s), []);
    queueRun(s, "  allume le salon  ", "id-1", "2026-08-14T10:00:00Z");
    check("ajout avec trim", listPending(s).map(e => e.input), ["allume le salon"]);
    queueRun(s, "   ", "id-2", "2026-08-14T10:01:00Z");
    check("entrée vide refusée", listPending(s).length, 1);
    queueRun(s, "résume ma journée", "id-3", "2026-08-14T10:02:00Z");
    removePending(s, "id-1");
    check("retrait par id", listPending(s).map(e => e.id), ["id-3"]);

    const cap = memory();
    for (let i = 0; i < 25; i++) queueRun(cap, "instruction " + i, "id-" + i, "2026-08-14T10:00:00Z");
    check("plafond 20 — les plus récentes gagnent", listPending(cap).length, 20);
    check("la plus ancienne conservée est la n°5", listPending(cap)[0].input, "instruction 5");

    const corrupt = memory();
    corrupt.setItem(PENDING_KEY, "{pas du json[");
    check("stockage corrompu toléré", listPending(corrupt), []);
    corrupt.setItem(PENDING_KEY, JSON.stringify([{ id: 1 }, { id: "ok", input: "x", queuedAt: "t" }]));
    check("entrées invalides filtrées", listPending(corrupt).map(e => e.id), ["ok"]);

    console.log((8 - failed) + "/8 cas de file passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
