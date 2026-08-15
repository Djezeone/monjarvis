# P8 — Connecteurs de service

**Statut : en construction — brique 1 (n8n) livrée.**

Les services extérieurs (n8n, Home Assistant, navigateur sandboxé) ne
tournent pas encore. Cette couche prépare chaque connecteur pour que la
mise en service se réduise à **brancher une URL** — jamais à écrire du
code — et pour que, tant que le service est absent, JARVIS le **dise**
au lieu de faire semblant.

## Brique 1 — n8n ✅

### Ce qui existait, ce qui manquait

`N8nWebhookAdapter` savait poster sur un webhook. Il manquait tout le
reste : l'allowlist promise par l'architecture, la porte d'approbation,
la traçabilité des exécutions et une vraie sonde de santé.

### Le connecteur

- **Allowlist** (`n8n-registry.ts`) : JARVIS ne poste jamais sur un chemin
  arbitraire. Un workflow doit être **déclaré** (nom + segment de chemin) ;
  les URLs complètes et les traversées de chemin sont refusées à la
  déclaration, pas au moment du tir.
- **Porte d'approbation** : le `PolicyEngine` classe le workflow à la
  déclaration (`payment`, `publish`, `delete`, `production`, `legal` →
  CRITICAL). Un CRITICAL répond **428 tant qu'aucune approbation explicite**
  n'est jointe — exactement le contrat du dispatch d'appareil.
- **Exécutions tracées** : chaque tir laisse une trace (succès ou échec avec
  le message réel de n8n), plafonnée à 200, dans `n8n-workflows.json` du
  data dir → emportée par l'Identity Pack. L'écran **Impact** compte
  désormais les workflows exécutés et les échecs, séparément.
- **Idempotence** : chaque tir porte une clé `jarvis-<workflowId>-<instant>`,
  pour qu'un rejeu réseau ne déclenche pas deux fois la même automatisation.
- **Sonde réelle** : n8n expose `/healthz`. L'organe n8n n'est plus
  « configuré, non vérifié » mais **connected / unreachable** dès que
  `N8N_BASE_URL` est connue.
- **Absences nommées** : sans configuration, le panneau liste ce qui manque,
  variable par variable, et le bouton d'exécution est désactivé.

### Mise en service (le jour où n8n tourne)

1. Dans le `.env.local` du **Core** :
   ```
   N8N_BASE_URL=http://127.0.0.1:5678
   N8N_WEBHOOK_BASE_URL=http://127.0.0.1:5678/webhook
   N8N_JARVIS_SECRET=<un secret partagé>
   ```
2. Dans n8n, un workflow avec un nœud **Webhook** (POST, chemin au choix),
   qui vérifie l'en-tête `X-Jarvis-Secret`.
3. Cockpit → monde **Action** → *Workflows n8n* → déclarer le nom et le
   chemin. Le tier est calculé et affiché à la déclaration.

Rien d'autre. Aucun code à toucher.

### Preuves

`npm run test:n8n` : 14/14 cas purs (chemins refusés — URL, traversée, vide,
trop long ; construction d'URL sans double slash ; état de configuration
variable par variable ; tiers ; idempotence). E2e contre un **double n8n**
qui parle le vrai contrat : la sonde de santé est réellement interrogée, le
double **reçoit** l'appel authentifié avec la charge utile et la clé
d'idempotence (assertions sur le fil, pas sur notre code), un workflow
critique refuse de tourner sans approbation puis accepte avec, et un échec
côté n8n (HTTP 500) est rapporté comme échec — jamais comme un succès.

## Reste

2. **Home Assistant** — même traitement : allowlist d'entités et de
   services, tiers déjà définis (`decideHomeService`), sonde `/api/`.
3. **Browser worker** — désactivé par défaut ; à préparer derrière le même
   contrat d'approbation.
