import { deploymentRole } from "@/server/deployment";

/**
 * Next.js server-boot hook: starts the P5 routine scheduler once per server
 * process. Core role only — a single resident process owns the ticker; a
 * façade (P6) is stateless and must never run schedulers of its own.
 *
 * The role comes from deploymentRole(), never from a raw env read: on Vercel
 * JARVIS_ROLE is typically unset, and `deploymentRole()` answers « facade »
 * from VERCEL=1 alone. Reading the variable directly meant a Vercel Function
 * — the one place that must never be the brain — started a 60 s ticker
 * against a read-only filesystem. Two definitions of the same word, and the
 * stricter one lost.
 *
 * Keep the NEXT_RUNTIME check as a wrapping `if`: the edge bundle relies on
 * static elimination of this exact shape to drop the node-only import.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (deploymentRole() === "facade") {
      console.log("[façade] rôle facade — ticker et registres désactivés, tout vit au Core");
      return;
    }
    const { startRoutineScheduler } = await import("@/server/routine-scheduler");
    startRoutineScheduler();
  }
}
