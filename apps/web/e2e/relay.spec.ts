import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * P10 brick 1 — the sealed façade↔Core link.
 *
 * Two instances carry this spec: a Core on :3105 whose API is sealed, and
 * on :3106 the one façade that holds the same secret. What is proved here
 * is not that a header exists — it is that the seal refuses everything it
 * claims to refuse, and that the pair still works end to end.
 */

const CORE = "http://127.0.0.1:3105";
const FACADE = "http://127.0.0.1:3106";
const SECRET = "e2e-Rel4y-Jarvis-X2-Seal-2026";
const AUTH = "e2e-Ph4se-Jarvis-X2-Secret-2026";
const HEADER = "x-jarvis-relay";

/** The façade's signature, recomputed here from the published contract. */
async function sign(method: string, pathname: string, ts = Date.now()): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = `jarvis-relay:${ts}:${method.toUpperCase()}:${pathname}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${ts}.${hex}`;
}

/**
 * The seal is a SECOND lock, never a replacement: past it, the sealed Core
 * still demands a session. Signing in through the seal is therefore part
 * of every test that expects to be served — and proof that both locks
 * stack rather than substitute for one another.
 */
async function signIn(request: APIRequestContext, base: string, extra: Record<string, string> = {}) {
  const r = await request.post(`${base}/api/jarvis/auth/login`, {
    data: { secret: AUTH },
    headers: { origin: base, ...extra },
  });
  expect(r.status()).toBe(200);
}

test.describe("P10 — lien façade↔Core scellé", () => {
  test("un Core scellé refuse l'anonyme AVANT même de proposer un login", async ({ request }) => {
    // The prize: an exposed Core offers nothing to brute-force. The login
    // endpoint is open by design (P6) — the seal is what stands in front.
    const login = await request.post(`${CORE}/api/jarvis/auth/login`, {
      data: { secret: AUTH },
      headers: { origin: CORE },
    });
    expect(login.status()).toBe(403);
    expect((await login.json()).relay).toBe("absent");

    // Same for the other anonymous door: the enrolment claim.
    const claim = await request.post(`${CORE}/api/jarvis/devices/enroll/claim`, {
      data: { code: "000000", id: "intrus", name: "Intrus", kind: "desktop" },
      headers: { origin: CORE },
    });
    expect(claim.status()).toBe(403);
  });

  test("une signature valide passe — et reste liée à sa route et à sa méthode", async ({
    request,
  }) => {
    await signIn(request, CORE, { [HEADER]: await sign("POST", "/api/jarvis/auth/login") });

    const ok = await request.get(`${CORE}/api/jarvis/health`, {
      headers: { [HEADER]: await sign("GET", "/api/jarvis/health") },
    });
    expect(ok.status()).toBe(200);

    // The same header replayed on another route: refused. A relay proof is
    // not a bearer token that authorises "anything".
    const elsewhere = await request.get(`${CORE}/api/jarvis/impact?days=1`, {
      headers: { [HEADER]: await sign("GET", "/api/jarvis/health") },
    });
    expect(elsewhere.status()).toBe(403);
    expect((await elsewhere.json()).relay).toBe("invalide");

    // And replayed with another method, on its own route: refused too.
    const otherMethod = await request.post(`${CORE}/api/jarvis/run`, {
      data: { input: "essai", device: "intrus" },
      headers: { [HEADER]: await sign("GET", "/api/jarvis/run"), origin: CORE },
    });
    expect(otherMethod.status()).toBe(403);
  });

  test("une signature périmée est refusée, et le dit", async ({ request }) => {
    const stale = await request.get(`${CORE}/api/jarvis/health`, {
      headers: { [HEADER]: await sign("GET", "/api/jarvis/health", Date.now() - 20 * 60_000) },
    });
    expect(stale.status()).toBe(403);
    // « expiré » vs « invalide » : an operator must be able to tell a
    // drifted clock from a mismatched secret without guessing.
    expect((await stale.json()).relay).toBe("expiré");
  });

  test("un mauvais secret est refusé — le sceau est une seconde serrure", async ({ request }) => {
    const ts = Date.now();
    const forged = `${ts}.${"0".repeat(64)}`;
    const r = await request.get(`${CORE}/api/jarvis/health`, { headers: { [HEADER]: forged } });
    expect(r.status()).toBe(403);
    expect((await r.json()).relay).toBe("invalide");
  });

  test("les satellites gardent leur porte : le jeton d'appareil traverse le sceau", async ({
    request,
  }) => {
    await signIn(request, CORE, { [HEADER]: await sign("POST", "/api/jarvis/auth/login") });

    // Enrolment itself goes through the relay (it is a human act, done from
    // the façade); the device then talks to the Core directly, as on a LAN.
    const enroll = await request.post(`${CORE}/api/jarvis/devices/enroll`, {
      headers: { [HEADER]: await sign("POST", "/api/jarvis/devices/enroll"), origin: CORE },
    });
    expect(enroll.status()).toBe(200);
    const { code } = await enroll.json();

    const id = `relay-sat-${Date.now().toString(36)}`;
    const claim = await request.post(`${CORE}/api/jarvis/devices/enroll/claim`, {
      data: { code, id, name: "Satellite scellé", kind: "desktop", capabilities: ["notify"] },
      headers: {
        [HEADER]: await sign("POST", "/api/jarvis/devices/enroll/claim"),
        origin: CORE,
      },
    });
    expect(claim.status()).toBe(200);
    const { token } = await claim.json();

    // No relay header at all — only the device token. It must work: a
    // per-device proof is stronger than the shared seal, and locking
    // satellites out of their own Core would buy nothing.
    const beat = await request.post(`${CORE}/api/jarvis/devices/${id}/heartbeat`, {
      data: { status: {} },
      headers: { "x-jarvis-device-token": token, origin: CORE },
    });
    expect(beat.status()).toBe(200);

    // Cleanup: a test device never stays authorised.
    const revoke = await request.post(`${CORE}/api/jarvis/devices/${id}/revoke`, {
      headers: { [HEADER]: await sign("POST", `/api/jarvis/devices/${id}/revoke`), origin: CORE },
    });
    expect(revoke.status()).toBe(200);
  });

  test("la paire complète fonctionne : la façade signe, le Core exécute un vrai run", async ({
    request,
  }) => {
    await signIn(request, FACADE);

    const status = await request.get(`${FACADE}/api/jarvis/facade/status`);
    expect(await status.json()).toMatchObject({
      role: "facade",
      coreReachable: true,
      relay: "ok",
    });

    const run = await request.post(`${FACADE}/api/jarvis/run`, {
      data: { input: "Preuve du lien scellé", device: "relay-e2e" },
      headers: { origin: FACADE },
    });
    expect(run.status()).toBe(200);
    expect((await run.json()).runId).toBeTruthy();
  });

  test("une façade sans le sceau voit le refus, et le nomme", async ({ request }) => {
    // :3102 is the façade of the OPEN Core — it holds no relay secret.
    // Pointed at the sealed Core it would be refused; its own status route
    // reports « off », which is the honest answer for an unsealed link.
    await signIn(request, "http://127.0.0.1:3102");
    const status = await request.get("http://127.0.0.1:3102/api/jarvis/facade/status");
    expect((await status.json()).relay).toBe("off");
  });
});
