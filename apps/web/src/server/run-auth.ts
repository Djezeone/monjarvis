import "server-only";
import { isAuthorizedUser } from "@/server/facade-auth";
import { authenticateDevice } from "@/server/device-registry";

/**
 * P6 brick 1 — authority check for the run endpoints, which serve two
 * callers: the user (session cookie when auth is on) and enrolled
 * satellites (device token — the voice bridge runs Core turns). The
 * middleware only lets device-token requests through; HERE the token is
 * actually verified (timingSafeEqual on its hash, revocation honored).
 */
export async function authorizeRunRequest(
  req: Request
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (await isAuthorizedUser(req)) return { ok: true };
  const device = authenticateDevice(req);
  if (device.ok) return { ok: true };
  return { ok: false, status: device.status, error: device.error };
}
