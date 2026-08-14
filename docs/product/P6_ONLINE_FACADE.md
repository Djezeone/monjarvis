# P6 — Online Façade (Vercel Presence Layer)

**Statut : en construction — briques 1 et 2 livrées.**

## Principe

Vercel (ou tout hébergeur de front) devient la **porte d'entrée online et le
control plane** de JARVIS X2 — jamais son cerveau. Le Core (Hermes, Graphiti,
Neo4j, n8n, registres P4/P5, ticker 60 s) reste un processus persistant :
aujourd'hui un VPS, demain la machine à la maison, derrière un relay
sécurisé. L'adresse publique ne change jamais ; seul `JARVIS_CORE_URL`
change de cible.

```
Téléphone / navigateur / PWA
          │ HTTPS/SSE
          ▼
   FAÇADE (Vercel)          ← UI, auth, API gateway, streaming, push
          │
          ▼
   JARVIS CORE (VPS → local) ← Hermes, mémoire, registres, ticker, secrets
```

Invariants hérités du MASTER_BUILD_PROMPT :

- **La façade n'accorde aucune autorité d'exécution.** Les décisions
  (tokens d'appareil, tiers READ/ACT/CRITICAL, FR-009) restent vérifiées
  côté serveur, au plus près de l'état.
- **L'état appartient au Core.** Les fichiers de `JARVIS_DATA_DIR`
  (appareils, sessions, préférences, routines, suggestions, apprentissages,
  skills) ne vivent jamais dans une Function éphémère.
- **Pas de Hermes dans une Function.** Runtime persistant = Core. Le ticker
  60 s (routines + sweeps) tourne uniquement côté Core. Vercel Cron ne sert
  qu'à de la maintenance web légère.

## Briques

1. ~~**Auth de façade**~~ ✅ — opt-in par `JARVIS_AUTH_SECRET` : absent, le
   comportement local-first actuel est inchangé ; présent, le middleware
   ferme `/app` et `/api/jarvis/*`. Session par cookie HttpOnly signé
   HMAC-SHA256 (Web Crypto, vérifiable en edge), expiration 30 j, login
   par secret unique (comparaison à temps constant), logout, page `/login`.
   **Les satellites gardent leur voie** : `enroll/claim` reste ouvert (le
   code one-shot est la preuve), heartbeat/commands restent authentifiés
   par token d'appareil, et `/run` + `/run/[id]` acceptent un token
   d'appareil valide à défaut de session — le middleware ne fait
   qu'aiguiller, l'autorité est toujours vérifiée dans la route
   (`timingSafeEqual` sur le hash du token). `dispatch`, `enroll`,
   `revoke` et tout le reste exigent la session utilisateur.
2. ~~**Rôles de déploiement**~~ ✅ — `JARVIS_ROLE=facade|core` (défaut :
   `core`, strictement l'app actuelle). En rôle façade, le middleware
   proxifie tout `/api/jarvis/*` vers `JARVIS_CORE_URL` (rewrite —
   cookies, tokens d'appareil et streaming transmis tels quels), après
   sa propre porte d'auth ; seules les routes `auth/*` et
   `facade/status` répondent localement. **Même `JARVIS_AUTH_SECRET`
   des deux côtés = SSO** : le cookie signé par la façade se re-vérifie
   au Core sans machinerie. La façade n'a ni état (`JARVIS_DATA_DIR`
   jamais créé — prouvé en e2e) ni ticker (`instrumentation` désactive
   le scheduler). `GET /api/jarvis/facade/status` dit honnêtement le
   rôle et la joignabilité du cerveau (toute réponse HTTP < 500 vaut
   preuve de vie — un Core sous auth répond légitimement 401 à la
   sonde sans cookie). Preuves e2e (:3102 façade → :3100 Core) :
   session exigée puis préférence écrite via la façade relue
   directement au Core ; run complet traversant la façade, session
   enregistrée par le registre du Core.
3. **Dégradation « Core offline » honnête** — bannière d'état, actions en
   attente rejouées au retour (pattern offline Level 0 remonté à la
   façade).
4. **PWA** — manifest, service worker, installable sur mobile (S24).
5. **Push web + guide de déploiement** — notifications push via la façade,
   `vercel.json` (cron maintenance seulement), guide VPS/local
   (`scripts/verify-local-stack.mjs` comme preuve côté Core).
