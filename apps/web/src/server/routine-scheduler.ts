import "server-only";
import { getJarvisService } from "@/server/jarvis";
import { startCoreRun } from "@/server/run-core";
import { deliverMessage } from "@/server/deliver";
import { getPreferences } from "@/server/preference-store";
import { dueRoutines, updateRoutine, type Routine } from "@/server/routine-registry";

const TICK_MS = 60_000;
let started = false;

/**
 * Execute one routine NOW: a real Core run, its output delivered through
 * the Presence Bus. Every outcome — including refusals — is recorded on the
 * routine, honestly.
 */
export async function executeRoutine(routine: Routine): Promise<string> {
  const finish = (outcome: string) => {
    updateRoutine(routine.id, {
      lastRunAt: new Date().toISOString(),
      lastOutcome: outcome,
    });
    return outcome;
  };

  const prefs = getPreferences();
  if (prefs.proactivity === "off") {
    return finish("ignorée — proactivité désactivée (préférences)");
  }

  const startOutcome = await startCoreRun({
    input: routine.prompt,
    device: `routine:${routine.name}`,
    instructions: `[Routine planifiée: ${routine.name}]`,
  });
  if ("error" in startOutcome) return finish(`échec du run: ${startOutcome.error}`);

  const { service } = getJarvisService();
  if (!service) return finish("échec: intelligence core non configuré");

  const deadline = Date.now() + 120_000;
  let detail = startOutcome.run;
  while (
    Date.now() < deadline &&
    !["completed", "failed", "cancelled", "stopped"].includes(detail.status)
  ) {
    await new Promise((r) => setTimeout(r, 1500));
    detail = await service.hermes.getRun(startOutcome.run.runId);
  }
  if (!detail.output) {
    detail = await service.hermes.getRun(startOutcome.run.runId);
  }
  if (detail.status !== "completed" || !detail.output) {
    return finish(`run ${startOutcome.run.runId} → ${detail.status}, rien à livrer`);
  }

  const delivery = deliverMessage({
    message: detail.output,
    modality: routine.modality,
    sessionKey: startOutcome.sessionKey,
  });
  if ("error" in delivery) {
    return finish(`run ok mais livraison impossible: ${delivery.error}`);
  }
  return finish(
    `livrée à « ${delivery.routing.deviceName} » (${delivery.routing.capability}) — ${delivery.routing.reason}`
  );
}

/**
 * Server-boot ticker (instrumentation.ts): due routines + suggestion sweep,
 * every minute.
 */
export function startRoutineScheduler(): void {
  if (started) return;
  started = true;
  console.log("[routines] scheduler démarré (tick 60 s)");
  setInterval(async () => {
    try {
      const { sweepSuggestions } = await import("@/server/suggestion-engine");
      const report = sweepSuggestions();
      if (report.generated || report.delivered) {
        console.log(
          `[suggestions] ${report.generated} nouvelle(s), ${report.delivered} livrée(s), ${report.capped} plafonnée(s)`
        );
      }
    } catch (e) {
      console.error(`[suggestions] sweep en erreur: ${e instanceof Error ? e.message : e}`);
    }
    try {
      const { sweepLearned } = await import("@/server/learned-store");
      const learned = sweepLearned();
      if (learned.generated) {
        console.log(
          `[apprentissage] ${learned.generated} proposition(s) de préférence — en attente de décision humaine`
        );
      }
    } catch (e) {
      console.error(`[apprentissage] sweep en erreur: ${e instanceof Error ? e.message : e}`);
    }
    try {
      const { sweepSkills } = await import("@/server/skill-store");
      const skills = sweepSkills();
      if (skills.generated) {
        console.log(
          `[skills] ${skills.generated} procédure(s) répétée(s) détectée(s) — en attente d'approbation`
        );
      }
    } catch (e) {
      console.error(`[skills] sweep en erreur: ${e instanceof Error ? e.message : e}`);
    }
    for (const routine of dueRoutines()) {
      console.log(`[routines] échéance: ${routine.name}`);
      try {
        const outcome = await executeRoutine(routine);
        console.log(`[routines] ${routine.name} → ${outcome}`);
      } catch (e) {
        updateRoutine(routine.id, {
          lastRunAt: new Date().toISOString(),
          lastOutcome: `erreur inattendue: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  }, TICK_MS).unref?.();
}
