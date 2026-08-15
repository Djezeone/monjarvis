#!/usr/bin/env node
/**
 * Unit cases for the pure suggestion rules. Usage: npm run test:suggestions
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const out = execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "-e", `
    import {
      offlineDeviceCandidates,
      failedCommandCandidates,
    } from ${JSON.stringify(join(here, "../src/server/suggestion-rules.ts"))};
    import { deliveryCapPerHour } from ${JSON.stringify(join(here, "../src/server/proactivity.ts"))};

    const now = new Date("2026-08-14T12:00:00");
    let failed = 0;
    const check = (label, got, expect) => {
      if (JSON.stringify(got) !== JSON.stringify(expect)) {
        failed++;
        console.error("FAIL", label, "→", JSON.stringify(got), "(attendu", JSON.stringify(expect) + ")");
      }
    };

    const devices = [
      { id: "a", name: "A", online: true,  revoked: false, lastSeenAt: "2026-08-14T11:59:00" },
      { id: "b", name: "B", online: false, revoked: false, lastSeenAt: "2026-08-14T11:45:00" },
      { id: "c", name: "C", online: false, revoked: true,  lastSeenAt: "2026-08-14T10:00:00" },
      { id: "d", name: "D", online: false, revoked: false, lastSeenAt: null },
      { id: "e", name: "E", online: false, revoked: false, lastSeenAt: "2026-08-14T11:55:00" },
    ];
    check("offline: seuil 10 min → seulement B",
      offlineDeviceCandidates(devices, now, 10).map(c => c.subject), ["b"]);
    check("offline: seuil 30 min → aucun",
      offlineDeviceCandidates(devices, now, 30).map(c => c.subject), []);

    const commands = [
      { id: "c1", deviceId: "a", capability: "notify", state: "failed", error: "boom", updatedAt: "2026-08-14T11:50:00" },
      { id: "c2", deviceId: "a", capability: "speak",  state: "done",   updatedAt: "2026-08-14T11:50:00" },
      { id: "c3", deviceId: "b", capability: "notify", state: "failed", updatedAt: "2026-08-14T09:00:00" },
    ];
    check("failed: fenêtre 60 min → seulement c1",
      failedCommandCandidates(commands, now, 60).map(c => c.subject), ["c1"]);
    check("failed: le message porte l'erreur",
      failedCommandCandidates(commands, now, 60)[0].message.includes("boom"), true);

    check("cap off", deliveryCapPerHour("off"), 0);
    check("cap low", deliveryCapPerHour("low"), 1);
    check("cap normal", deliveryCapPerHour("normal"), 4);

    // P7 brick 3: each candidate carries the degree that picks its channel.
    check("un satellite quelconque hors ligne reste au niveau info",
      offlineDeviceCandidates(devices, now, 10)[0].level, "info");
    check("perdre l'appareil de sortie par défaut est important",
      offlineDeviceCandidates(devices, now, 10, "b")[0].level, "important");
    check("le message le dit explicitement",
      offlineDeviceCandidates(devices, now, 10, "b")[0].message.includes("sortie par défaut"), true);
    check("une commande échouée est utile à signaler",
      failedCommandCandidates(commands, now, 60)[0].level, "useful");

    console.log((11 - failed) + "/11 cas de règles passent");
    process.exit(failed ? 1 : 0);
  `],
  { encoding: "utf8" }
);
process.stdout.write(out);
