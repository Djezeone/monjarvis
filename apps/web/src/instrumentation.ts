/**
 * Next.js server-boot hook: starts the P5 routine scheduler once per server
 * process (local-first Core — a single resident process owns the ticker).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRoutineScheduler } = await import("@/server/routine-scheduler");
    startRoutineScheduler();
  }
}
