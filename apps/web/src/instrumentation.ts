/**
 * Next.js server-boot hook: starts the P5 routine scheduler once per server
 * process. Core role only — a single resident process owns the ticker; a
 * façade (P6) is stateless and must never run schedulers of its own.
 *
 * Keep the NEXT_RUNTIME check as a wrapping `if`: the edge bundle relies on
 * static elimination of this exact shape to drop the node-only import.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.JARVIS_ROLE === "facade") {
      console.log("[façade] rôle facade — ticker et registres désactivés, tout vit au Core");
      return;
    }
    const { startRoutineScheduler } = await import("@/server/routine-scheduler");
    startRoutineScheduler();
  }
}
