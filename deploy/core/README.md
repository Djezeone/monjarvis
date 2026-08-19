# Déployer le Core JARVIS X2

Le Core est le **cerveau** : Hermes, la mémoire, les registres, le ticker 60 s,
les secrets. Il ne se déploie **jamais** sur Vercel — une Function éphémère ne
peut ni tenir un runtime agent persistant, ni garder un état de fichiers, ni
faire tourner une horloge. La façade Vercel, elle, ne fait que l'exposer
(voir `docs/product/P6_ONLINE_FACADE.md`).

Cible : un VPS Linux ou votre machine à la maison. Les deux se traitent
pareil ; seul le relay diffère.

---

## 0. Préflight — avant toute chose

```bash
cd apps/web && npm run preflight
```

Le rapport dit, **couche par couche** : ce qui est configuré, ce qui manque et
**la conséquence exacte** de chaque manque. Avec `--probe`, il interroge
réellement les services déclarés au lieu de supposer qu'ils répondent :

```bash
npm run preflight -- --probe
```

Code de sortie 1 s'il manque un **bloquant** (Hermes). Tout le reste est
optionnel : chaque organe absent se déclarera lui-même non configuré dans le
cockpit, sans jamais faire semblant.

---

## 1. Utilisateur et arborescence

```bash
sudo useradd --system --create-home --home-dir /opt/jarvis jarvis
sudo mkdir -p /var/lib/jarvis/data && sudo chown -R jarvis:jarvis /var/lib/jarvis
sudo -u jarvis git clone https://github.com/Djezeone/monjarvis.git /opt/jarvis/monjarvis
```

`/var/lib/jarvis/data` est le `JARVIS_DATA_DIR` : **tout** l'état de JARVIS y
vit, et c'est exactement ce que l'Identity Pack exporte. C'est le seul
répertoire à sauvegarder.

## 2. Dépendances conteneurisées (Neo4j, n8n)

```bash
cd /opt/jarvis/monjarvis
export N8N_PASSWORD='…'          # requis, sinon compose refuse de démarrer
docker compose -f deploy/core/docker-compose.yml up -d
```

Tous les ports sont liés à `127.0.0.1` : **rien n'est exposé au réseau**.

## 3. Hermes (natif) et Graphiti (uvicorn)

Ces deux-là ne sont pas conteneurisés ici, parce qu'ils ne s'installent pas
ainsi : suivez `docs/layers/P3/FREE_LOCAL_STACK.md` (installation officielle
Hermes, puis `services/local-stack/graphiti_service.py` dans un venv).
Inventer une image Docker pour eux documenterait un déploiement qui n'existe
pas.

## 4. Configuration

```bash
cp deploy/core/.env.example apps/web/.env.local
$EDITOR apps/web/.env.local        # chaque variable porte sa conséquence
cd apps/web && npm run vapid       # clés push, à recopier dans .env.local
```

Deux points qui décident du reste :

- **`JARVIS_AUTH_SECRET`** — 24 caractères minimum (`openssl rand -base64 32`),
  **le même que sur Vercel** (session unique). En dessous du plancher, la
  façade refuse tout le monde, y compris avec le bon secret.
- **`JARVIS_TRUSTED_ORIGINS`** — l'origine de votre façade. Sans elle, la
  façade reçoit 403 sur chaque écriture (garde d'origine, P9). Échec bruyant,
  jamais silencieux.

## 5. Build et services

```bash
cd /opt/jarvis/monjarvis/apps/web && npm ci && npm run build
sudo cp /opt/jarvis/monjarvis/deploy/core/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis-hermes jarvis-graphiti jarvis-core
```

## 6. Preuve que la stack vit

```bash
node scripts/verify-local-stack.mjs
curl -s http://127.0.0.1:3000/api/jarvis/health | jq
```

L'endpoint santé ne rapporte que du **vérifié** : `connected` /
`unreachable` / `not_configured`. Le browser worker, lui, n'a pas de contrat
de santé documenté : il ne rapporte que sa configuration, jamais un verdict
fabriqué.

## 6 bis. Vérification d'acceptation — la chaîne fonctionne-t-elle ?

Le pendant du préflight, à lancer **après** le déploiement, contre l'URL
réelle (façade publique ou Core) :

```bash
cd apps/web
npm run smoke -- --base https://votre-app.vercel.app --secret '…'
npm run smoke -- --base http://127.0.0.1:3000            # Core local
```

Rien n'y est simulé : le run traverse Hermes pour de bon, un appareil de test
est réellement enrôlé, une commande réellement dispatchée puis exécutée — et
l'appareil est **révoqué** en fin de course. Les organes non configurés sont
comptés comme *annoncés, pas cassés* ; seules les étapes essentielles font
sortir en erreur.

À lancer après chaque changement de `JARVIS_CORE_URL`, de secret ou de relay.

## 7. Exposer le Core — sans ouvrir de port

La façade doit joindre le Core, **le monde non**. Trois voies, par ordre de
préférence :

1. **Tailscale** — le Core rejoint votre réseau privé ; `JARVIS_CORE_URL`
   pointe sur son nom Tailscale.
2. **Tunnel sortant** (Cloudflare Tunnel, `ssh -R`) — aucune entrée à ouvrir
   sur votre box.
3. **Pare-feu strict** sur un VPS : n'autorisez que les IP sortantes de la
   façade, en HTTPS.

Dans les trois cas, `HERMES_API_URL` (8642), Neo4j et n8n restent sur
`127.0.0.1`. Seul le port 3000 du Core est joignable, et seulement par la
façade.

## 8. Déménager le cerveau (VPS → maison)

```bash
node scripts/identity-pack.mjs export --out jarvis.pack   # sur l'ancien Core
node scripts/identity-pack.mjs import --in jarvis.pack    # sur le nouveau
```

Puis changez `JARVIS_CORE_URL` côté Vercel. **L'adresse publique de JARVIS ne
change pas** — appareils enrôlés, sessions, préférences, routines, skills et
apprentissages suivent le pack, chiffrés.

---

## Sauvegarde

Une seule chose compte : `JARVIS_DATA_DIR`. Un export d'Identity Pack
hebdomadaire vers un stockage hors machine suffit à tout reconstituer.
