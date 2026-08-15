# P9 — Durcissement sécurité

**Statut : en construction — brique 1 livrée.**

Revue adverse des chemins d'autorité de JARVIS X2 : qui peut faire agir le
Core, et par quelle porte. Ce document consigne ce qui a été trouvé, ce qui
a été corrigé, et ce qui a été vérifié comme sain.

## Brique 1 — Garde d'origine (CSRF) ✅

### La faille

En mode **local-first** — sans `JARVIS_AUTH_SECRET`, c'est-à-dire le
comportement par défaut et l'usage quotidien à la maison — **n'importe quel
site web visité pouvait faire agir le Core** :

```js
fetch("http://127.0.0.1:3000/api/jarvis/devices/dispatch", {
  method: "POST", mode: "no-cors",
  headers: { "Content-Type": "text/plain" },   // ← requête « simple » :
  body: JSON.stringify({                       //   aucun preflight CORS
    deviceId: "…", capability: "camera.capture", approvedBy: "operator",
  }),
})
```

Trois faits se combinaient :

1. `Content-Type: text/plain` fait une **requête simple** — le navigateur
   n'envoie pas de preflight, donc rien ne bloque l'envoi ;
2. les routes lisent le corps avec `req.json()`, qui **ignore le
   Content-Type** — la charge utile JSON était donc bien parsée ;
3. `approvedBy` est fourni par l'appelant : l'attaquant **s'auto-approuvait**
   la porte FR-009.

L'attaquant ne pouvait pas *lire* la réponse (`no-cors`), mais l'effet de
bord — caméra, serrure, tâche navigateur — avait déjà eu lieu.

En mode authentifié, le cookie `SameSite=Lax` n'est pas envoyé en POST
cross-site : le middleware répondait 401 et la faille ne s'appliquait pas.
**C'est précisément le mode local qui était exposé**, celui qui n'a pas de
cookie à retenir.

### Le correctif

`origin-guard.ts` : toute requête **mutante** (POST, PUT, DELETE, PATCH)
portant une origine étrangère est refusée **avant d'atteindre une route**,
dans les deux modes. Les règles :

- **Pas d'`Origin` du tout → laissé passer.** Les agents satellites, le home
  node et `curl` ne sont pas des navigateurs ; ils portent déjà leur propre
  jeton d'appareil.
- **Même hôte → autorisé.** Le cockpit continue de fonctionner.
- **Origine déclarée de confiance → autorisée.** Un Core derrière la façade
  Vercel doit la nommer : `JARVIS_TRUSTED_ORIGINS=https://…`. Déclarer
  explicitement qui a le droit de vous commander est le but, pas une corvée.
- **`Origin: null`** (iframe bac à sable, certaines redirections) → refusé.
- **Les lectures ne sont jamais bloquées.**

### Preuves

`npm run test:origin` : 14/14 cas purs (méthodes gardées, même origine,
site tiers, port différent, `null`, origine illisible, liste de confiance
nettoyée, voisin trompeur `…vercel.app.evil.com` refusé).

E2e : **l'attaque exacte est rejouée** (Origin étranger + `text/plain` +
`approvedBy`) sur `devices/dispatch`, `home/call`, `browser/run`,
`preferences`, `devices/enroll` et `run` — toutes en 403, PUT compris ;
les appels légitimes (même origine, sans origine, lectures) passent ; et le
rejeu de file **à travers la façade** prouve que le chemin « origine de
confiance » fonctionne bout en bout.

### Conséquence de configuration

Un Core piloté par une façade doit désormais déclarer :

```
JARVIS_TRUSTED_ORIGINS=https://jarvis-x2.vercel.app
```

Sans cette ligne, la façade reçoit 403 sur toute écriture — un échec
bruyant et explicite, jamais silencieux.

## Vérifié comme sain (aucune action)

- **Codes d'enrôlement** : 128 bits d'aléa (`randomBytes(16)`), à usage
  unique, TTL 10 minutes, comparés par hachage — la force brute n'est pas
  un vecteur réaliste, pas de limitation de débit nécessaire ici.
- **Jetons d'appareil** : 256 bits, stockés hachés, comparés en temps
  constant (`timingSafeEqual`), révocation immédiate honorée.
- **Jetons de session de façade** : HMAC-SHA256, expiration vérifiée,
  falsification de l'échéance rejetée, cookie `HttpOnly`, `Secure` derrière
  HTTPS réel.
- **Chemins injectables** : workflows n8n, `entity_id` Home Assistant et
  domaines navigateur sont validés **à la déclaration**, jamais au moment du
  tir — une URL, une traversée de chemin ou une majuscule n'entrent pas dans
  les allowlists.
- **Secrets** : `HERMES_API_KEY`, `HASS_TOKEN`, `N8N_JARVIS_SECRET`, clés
  VAPID privées et jetons worker restent côté serveur ; aucun n'est exposé
  par une route ou un composant client.
