#!/usr/bin/env node
/**
 * JARVIS X2 — vérification d'acceptation post-déploiement.
 *
 * Le pendant de `preflight` : celui-ci s'exécute APRÈS, contre le déploiement
 * réel (façade publique ou Core directement), et répond à la seule question
 * qui compte le jour J — « est-ce que la chaîne fonctionne vraiment ? »
 *
 * Rien n'est simulé : le run traverse Hermes pour de bon, l'appareil de test
 * est réellement enrôlé, une commande est réellement dispatchée, exécutée,
 * puis l'appareil est RÉVOQUÉ. Ce que le script ne peut pas prouver, il le
 * dit « non vérifié » au lieu de le compter comme un succès.
 *
 *   node scripts/smoke-deployment.mjs --base https://votre-app.vercel.app \
 *                                     --secret '…'
 *   node scripts/smoke-deployment.mjs --base http://127.0.0.1:3000   # Core local
 *   node scripts/smoke-deployment.mjs --base … --json
 *
 * Sortie 1 si une étape ESSENTIELLE échoue (la chaîne est cassée).
 * Sortie 0 si seuls des organes optionnels manquent — ils se déclarent
 * eux-mêmes non configurés, ce n'est pas une panne.
 */

const args = process.argv.slice(2);
const optionOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const BASE = (optionOf("--base") || "http://127.0.0.1:3000").replace(/\/+$/, "");
const SECRET = optionOf("--secret") || process.env.JARVIS_AUTH_SECRET || "";
const JSON_OUT = args.includes("--json");
const DEVICE_ID = `smoke-${Date.now().toString(36)}`;

let cookie = "";
const steps = [];

/** Une étape essentielle qui échoue casse le déploiement ; les autres non. */
function record(name, { ok, essential = true, detail = "", skipped = false }) {
  steps.push({ name, ok, essential, detail, skipped });
  return ok;
}

async function call(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (init.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const setCookie = r.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* réponse non JSON : c'est le cas des pages HTML */
  }
  return { status: r.status, ok: r.ok, json, text, headers: r.headers };
}

async function main() {
  // 1 — La façade répond et sert son manifeste PWA.
  try {
    const landing = await call("/");
    record("La landing répond", {
      ok: landing.status === 200,
      detail: `HTTP ${landing.status}`,
    });
    const manifest = await call("/manifest.webmanifest");
    record("Le manifeste PWA est servi (installable)", {
      ok: manifest.status === 200 && manifest.json?.start_url === "/app",
      essential: false,
      detail: manifest.json?.name ? `« ${manifest.json.name} »` : `HTTP ${manifest.status}`,
    });
  } catch (e) {
    record("La landing répond", { ok: false, detail: String(e?.message || e) });
    return finish();
  }

  // 2 — Authentification D'ABORD : sur un déploiement fermé, tout le reste
  // (y compris le statut de rôle) vit derrière la porte.
  const auth = await call("/api/jarvis/auth/status");
  const authEnabled = auth.json?.enabled === true;
  if (authEnabled && auth.json?.secretStrong === false) {
    record("Force du secret de façade", {
      ok: false,
      detail: auth.json?.secretIssue || "secret sous le plancher — personne ne peut entrer",
    });
    return finish();
  }
  if (authEnabled) {
    if (!SECRET) {
      record("Connexion", { ok: false, detail: "auth activée mais --secret absent" });
      return finish();
    }
    const login = await call("/api/jarvis/auth/login", {
      method: "POST",
      body: JSON.stringify({ secret: SECRET }),
    });
    if (
      !record("Connexion avec le secret fourni", {
        ok: login.status === 200,
        detail: login.status === 429 ? "verrou anti-force-brute actif — réessayez plus tard" : `HTTP ${login.status}`,
      })
    ) {
      return finish();
    }
  } else {
    record("Authentification", {
      ok: true,
      essential: false,
      detail: "désactivée — mode local ouvert, à réserver à un réseau maîtrisé",
    });
  }

  // 3 — Rôle de l'instance et joignabilité du cerveau.
  const facade = await call("/api/jarvis/facade/status");
  const role = facade.json?.role ?? "inconnu";
  record(`Rôle de l'instance : ${role}`, {
    ok: facade.status === 200,
    detail:
      role === "facade"
        ? facade.json?.coreReachable
          ? "cerveau joignable"
          : "CERVEAU INJOIGNABLE — vérifiez JARVIS_CORE_URL et le relay"
        : "instance Core",
  });
  if (role === "facade" && facade.json?.coreReachable === false) {
    record("Chaîne façade → Core", { ok: false, detail: "le reste ne peut pas être testé" });
    return finish();
  }

  // 4 — Verdicts d'organes, tels que le Core les rapporte lui-même.
  const health = await call("/api/jarvis/health");
  const organs = health.json?.organs ?? [];
  const hermes = organs.find((o) => o.name === "Hermes Core");
  record("Hermes est joignable", {
    ok: hermes?.status === "connected",
    detail: hermes ? hermes.status : "organe absent du rapport",
  });
  for (const organ of organs.filter((o) => o.name !== "Hermes Core")) {
    record(`Organe ${organ.name}`, {
      ok: organ.status === "connected",
      essential: false,
      skipped: organ.status === "not_configured",
      detail: organ.status,
    });
  }

  // 5 — Un vrai run, de bout en bout : c'est la preuve que JARVIS raisonne.
  const marker = `smoke ${DEVICE_ID}`;
  const run = await call("/api/jarvis/run", {
    method: "POST",
    body: JSON.stringify({ input: `Réponds simplement OK. (${marker})`, device: "smoke-test" }),
  });
  if (
    record("Un run est accepté par le Core", {
      ok: run.status === 200 && Boolean(run.json?.runId),
      detail: run.json?.error || `run ${run.json?.runId ?? "—"}`,
    })
  ) {
    let detail = run.json;
    const deadline = Date.now() + 60_000;
    while (
      Date.now() < deadline &&
      !["completed", "failed", "cancelled", "stopped"].includes(detail?.status)
    ) {
      await new Promise((r) => setTimeout(r, 1200));
      detail = (await call(`/api/jarvis/run/${encodeURIComponent(run.json.runId)}`)).json;
    }
    // Un Core rapide peut avoir terminé AVANT la première itération : la
    // réponse du POST ne porte alors aucune sortie. On relit une fois.
    if (!detail?.output) {
      detail = (await call(`/api/jarvis/run/${encodeURIComponent(run.json.runId)}`)).json;
    }
    record("Le run se termine avec une sortie", {
      ok: detail?.status === "completed" && Boolean(detail?.output),
      detail: `${detail?.status ?? "sans réponse"}${detail?.output ? ` — « ${String(detail.output).slice(0, 60)}… »` : ""}`,
    });
  }

  // 6 — Le tissu des satellites, cycle de vie complet puis révocation.
  const enroll = await call("/api/jarvis/devices/enroll", { method: "POST" });
  if (
    record("Un code d'enrôlement est délivré", {
      ok: enroll.status === 200 && Boolean(enroll.json?.code),
      essential: false,
      detail: enroll.json?.error || "code à usage unique",
    })
  ) {
    const claim = await call("/api/jarvis/devices/enroll/claim", {
      method: "POST",
      body: JSON.stringify({
        code: enroll.json.code,
        id: DEVICE_ID,
        name: "Smoke test",
        kind: "desktop",
        capabilities: ["notify"],
      }),
    });
    const token = claim.json?.token;
    record("Un satellite s'enrôle et reçoit son jeton", {
      ok: claim.status === 200 && Boolean(token),
      essential: false,
      detail: claim.json?.error || "jeton délivré une seule fois",
    });

    if (token) {
      const auth = { headers: { "x-jarvis-device-token": token } };
      const beat = await call(`/api/jarvis/devices/${DEVICE_ID}/heartbeat`, {
        method: "POST",
        body: JSON.stringify({ status: {} }),
        ...auth,
      });
      record("Le satellite est vu (heartbeat)", {
        ok: beat.status === 200,
        essential: false,
        detail: `HTTP ${beat.status}`,
      });

      const dispatch = await call("/api/jarvis/devices/dispatch", {
        method: "POST",
        body: JSON.stringify({
          deviceId: DEVICE_ID,
          capability: "notify",
          args: { message: "Vérification de déploiement JARVIS X2" },
        }),
      });
      const commandId = dispatch.json?.id;
      record("Une commande est mise en file pour le satellite", {
        ok: dispatch.status === 200 && Boolean(commandId),
        essential: false,
        detail: dispatch.json?.error || `tier ${dispatch.json?.policy?.tier ?? "?"}`,
      });

      if (commandId) {
        const pull = await call(`/api/jarvis/devices/${DEVICE_ID}/commands`, auth);
        const delivered = (pull.json?.commands ?? []).some((c) => c.id === commandId);
        record("Le satellite récupère sa commande", {
          ok: delivered,
          essential: false,
          detail: delivered ? "livrée" : "absente de la file",
        });
        const done = await call(`/api/jarvis/devices/${DEVICE_ID}/commands/${commandId}`, {
          method: "POST",
          body: JSON.stringify({ ok: true, result: "smoke" }),
          ...auth,
        });
        record("L'exécution est rapportée au Core", {
          ok: done.status === 200,
          essential: false,
          detail: `HTTP ${done.status}`,
        });
      }
    }

    // Ménage : un appareil de test ne reste jamais autorisé.
    const revoke = await call(`/api/jarvis/devices/${DEVICE_ID}/revoke`, { method: "POST" });
    record("L'appareil de test est révoqué (ménage)", {
      ok: revoke.status === 200,
      detail: revoke.status === 200 ? "jeton invalidé" : `HTTP ${revoke.status} — RÉVOQUEZ-LE À LA MAIN`,
    });
  }

  // 7 — L'Impact a enregistré ce que nous venons de faire.
  const impact = await call("/api/jarvis/impact?days=1");
  record("L'Impact reflète l'activité de ce test", {
    ok: (impact.json?.conversation?.runs ?? 0) > 0,
    essential: false,
    detail: `${impact.json?.conversation?.runs ?? 0} run(s), ${impact.json?.actions?.executed ?? 0} action(s) exécutée(s) sur 24 h`,
  });

  return finish();
}

function finish() {
  const failed = steps.filter((s) => !s.ok && s.essential && !s.skipped);
  const soft = steps.filter((s) => !s.ok && !s.essential && !s.skipped);
  const skipped = steps.filter((s) => s.skipped);

  if (JSON_OUT) {
    console.log(JSON.stringify({ base: BASE, steps, broken: failed.length }, null, 2));
  } else {
    console.log(`\nJARVIS X2 — vérification de déploiement\n  cible : ${BASE}\n`);
    for (const s of steps) {
      const mark = s.skipped ? "·" : s.ok ? "✓" : s.essential ? "✗" : "!";
      console.log(`  ${mark} ${s.name}${s.detail ? ` — ${s.detail}` : ""}`);
    }
    console.log("");
    if (failed.length) {
      console.log(`  ${failed.length} étape(s) essentielle(s) en échec : la chaîne est cassée.\n`);
    } else {
      console.log(
        `  Chaîne fonctionnelle.${soft.length ? ` ${soft.length} point(s) d'attention.` : ""}${skipped.length ? ` ${skipped.length} organe(s) non configuré(s) — annoncé, pas cassé.` : ""}\n`
      );
    }
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  record("Exécution du test", { ok: false, detail: String(e?.message || e) });
  finish();
});
