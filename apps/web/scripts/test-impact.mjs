#!/usr/bin/env node
/**
 * Unit cases for the pure impact rules. Usage: npm run test:impact
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      inWindow,
      commandImpact,
      suggestionImpact,
      decisionImpact,
      NOT_MEASURED,
    } from ${JSON.stringify(join(here, "../src/server/impact-rules.ts"))};

    const now = new Date("2026-08-14T12:00:00Z");
    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };
    const day = (d) => "2026-08-" + String(d).padStart(2, "0") + "T09:00:00Z";

    check("fenêtre 7 j : hors bornes exclus",
      inWindow([{ at: day(14) }, { at: day(10) }, { at: day(1) }], now, 7).length, 2);
    check("horodatage invalide exclu",
      inWindow([{ at: "pas une date" }, { at: day(14) }], now, 7).length, 1);
    check("futur exclu",
      inWindow([{ at: "2026-09-01T00:00:00Z" }], now, 7).length, 0);

    const commands = [
      { state: "done",      tier: "ACT",      at: day(14) },
      { state: "done",      tier: "CRITICAL", approvedBy: "operator", at: day(13) },
      { state: "failed",    tier: "ACT",      at: day(13) },
      { state: "refused",   tier: "CRITICAL", at: day(12) },
      { state: "pending",   tier: "READ",     at: day(14) },
      { state: "delivered", tier: "ACT",      at: day(14) },
      { state: "done",      tier: "ACT",      at: day(1) },
    ];
    check("actions sur 7 j",
      commandImpact(commands, now, 7),
      { executed: 2, failed: 1, refused: 1, criticalApproved: 1, inFlight: 2 });
    check("CRITICAL sans approbation non compté",
      commandImpact([{ state: "done", tier: "CRITICAL", at: day(14) }], now, 7).criticalApproved, 0);
    check("fenêtre 30 j inclut l'ancienne action",
      commandImpact(commands, now, 30).executed, 3);

    check("suggestions : levées / livrées / ignorées",
      suggestionImpact([
        { createdAt: day(14), deliveredAt: day(14), dismissedAt: null },
        { createdAt: day(13), deliveredAt: null,    dismissedAt: day(13) },
        { createdAt: day(1),  deliveredAt: day(1),  dismissedAt: null },
      ], now, 7),
      { raised: 2, delivered: 1, dismissed: 1 });

    check("décisions : proposé / adopté / rejeté",
      decisionImpact([
        { status: "promoted", createdAt: day(14) },
        { status: "rejected", createdAt: day(14) },
        { status: "proposed", createdAt: day(13) },
      ], now, 7, "promoted"),
      { proposed: 3, accepted: 1, refused: 1 });
    check("statut d'acceptation paramétrable (skills)",
      decisionImpact([{ status: "approved", createdAt: day(14) }], now, 7, "approved").accepted, 1);

    check("les métriques non observables sont nommées", NOT_MEASURED.length >= 3, true);
    check("aucune estimation d'heures gagnées",
      NOT_MEASURED.some(m => m.includes("heures gagnées")), true);

    console.log((12 - failed) + "/12 cas d'impact passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
