# P8 — Connecteurs de service

**Statut : LIVRÉ — n8n, Home Assistant et browser worker sont prêts à brancher.**

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

## Brique 2 — Home Assistant ✅

Le monde physique est l'endroit où une erreur coûte le plus cher : une
porte déverrouillée n'est pas un tweet effacé. L'allowlist y est donc plus
stricte que celle de n8n.

- **Allowlist d'entités** (`home-registry.ts`) : JARVIS voit toute la
  maison par l'API, mais ne **lit** et n'**agit** que sur les entités
  déclarées — hors allowlist, 403, et rien ne part vers Home Assistant.
- **Déclarer n'est pas consentir** : même déclarés, les **domaines gardés**
  (`lock`, `alarm_control_panel`, `cover`, `climate`) et les services
  difficilement réversibles (`unlock`, `disarm`, `open`, `delete`,
  `set_temperature`) répondent **428 tant qu'aucune approbation explicite**
  n'est jointe. Le cockpit demande alors confirmation avant de rejouer
  l'appel avec l'accord.
- **Exécutions tracées** : succès, échecs avec le message réel, et
  **qui a approuvé**. L'écran Impact distingue les actions maison faites
  avec votre accord de celles qui n'en avaient pas besoin.
- **Sonde réelle** : `/api/` avec le jeton — un seul verdict, porté par le
  connecteur (le doublon de sonde dans la route santé a disparu).
- **Validation stricte** : `entity_id` en `domaine.objet` minuscule,
  services en snake_case — les injections de chemin et les majuscules sont
  refusées à la déclaration.

### Mise en service

```
HASS_URL=http://127.0.0.1:8123
HASS_TOKEN=<jeton d'accès longue durée>
```
Puis cockpit → monde **Monde** → *Maison* → déclarer `light.salon`, etc.

### Preuves

`npm run test:home` : 15/15 cas purs (entités et services valides/refusés,
domaines gardés, services irréversibles, état de configuration). E2e contre
un **double Home Assistant** : sonde réelle, **hors allowlist le double ne
reçoit rien**, une entité déclarée se lit et s'actionne pour de vrai
(assertions sur ce que HA a reçu), une serrure refuse puis accepte avec
approbation — et **rien n'était parti pendant le refus** —, un échec HTTP
500 est rapporté comme échec.

## Brique 3 — Browser worker ✅

La capacité la plus dangereuse : un navigateur porte vos sessions
connectées, et un agent qui clique dedans peut faire tout ce que vous
pouvez faire. Trois garde-fous, pas un seul.

1. **Éteint par défaut** — avoir une URL et un jeton ne suffit pas :
   `JARVIS_BROWSER_ENABLED=1` est requis. Même si la configuration fuit
   dans l'environnement, le connecteur reste muet.
2. **Allowlist de domaines** — une tâche doit **déclarer où elle va**, et
   chaque domaine doit avoir été déclaré. Les sous-domaines d'un domaine
   autorisé passent ; les suffixes trompeurs (`notexemple.fr` face à
   `exemple.fr`) sont rejetés. Normalisation à la déclaration : schéma,
   chemin et port n'entrent jamais dans l'allowlist.
3. **Toujours une approbation** — et **volontairement aucun niveau
   « lecture seule »** : JARVIS ne peut pas savoir d'avance ce qu'une
   tâche en texte libre cliquera, donc prétendre qu'une tâche est
   réversible serait un mensonge. Le tier unique est exposé comme une
   fonction pour qu'aucun appelant ne puisse le rétrograder discrètement.

S'y ajoute une **autonomie bornée** : le nombre de pas est plafonné côté
serveur (`JARVIS_BROWSER_MAX_STEPS`, 12 par défaut) — une demande à 99 pas
part à 12.

**Santé** : contrairement à n8n (`/healthz`) et Home Assistant (`/api/`),
le worker n'a **aucun contrat de santé documenté**. Plutôt que d'inventer
un endpoint et de rendre un verdict fabriqué, ce connecteur ne rapporte
que sa **configuration** — en distinguant « configuré mais éteint » de
« absent ».

### Mise en service

```
JARVIS_BROWSER_ENABLED=1
JARVIS_BROWSER_WORKER_URL=http://127.0.0.1:8772
JARVIS_BROWSER_WORKER_TOKEN=<jeton>
```
Puis cockpit → monde **Action** → *Navigateur agentique* → déclarer les
domaines.

### Preuves

`npm run test:browser` : 17/17 cas purs (normalisation, sous-domaines,
suffixes trompeurs, plafonds, activation, tier unique). E2e contre un
**double worker** : une tâche sur un domaine non déclaré **n'atteint jamais
le worker**, une tâche sans approbation **non plus**, une tâche approuvée
part réellement avec ses domaines et ses pas **plafonnés à 5 au lieu de 99
demandés** (assertions sur ce que le worker a reçu), et un échec est
rapporté comme échec.

**P8 est complet** : les trois connecteurs attendent leurs services.
