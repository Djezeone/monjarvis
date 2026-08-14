# P4 — OMNIPRESENCE FABRIC

**Statut : spécification adoptée — fondation implémentée (v0).**
P0→P3 ont donné : interface → présence → voix → intelligence. P4 donne à la
même identité JARVIS la capacité de suivre l'utilisateur d'un appareil à
l'autre. P4 précède P5 (personnalisation) : avant d'apprendre davantage sur
l'utilisateur, JARVIS doit pouvoir être avec lui partout.

## Architecture retenue : Core + Satellites

```text
                    ┌─────────────────┐
                    │ OPTIONAL CLOUD  │
                    │     BOOST       │
                    └────────┬────────┘
                             │
              ┌──────────────▼───────────┐
              │       JARVIS CORE        │
              │ Hermes · Ollama          │
              │ Graphiti · Neo4j         │
              │ n8n · Skills             │
              │ Policy Engine            │
              │ Agent Registry           │
              │ Device Registry ✅        │
              │ Presence (heartbeats) ✅  │
              └────────────┬─────────────┘
                           │
                     PRIVATE MESH
                           │
       ┌───────────────────┼──────────────────┐
       ▼                   ▼                  ▼
  JARVIS PHONE        JARVIS DESKTOP      JARVIS HOME
  Satellite           Satellite ✅         Satellites
  Voice/Camera        Browser/Files       Voice/IoT
  GPS/Notify          Terminal/Apps       Home Assistant
```

> JARVIS n'habite plus une machine. Il possède un Core et plusieurs corps.

### 1. Le Core vit sur une machine toujours allumée
Mini-PC, workstation, serveur maison ou NAS adapté. Le téléphone et le laptop
n'exécutent pas le gros modèle : ce sont des portes d'accès au même JARVIS.
Hermes s'y prête déjà (API server : runs, streaming, sessions, auth ; proxy
mode pour gateway léger).

### 2. Chaque appareil est un Satellite
Un satellite expose des **capabilities** déclarées (voice, notify, caméra,
fichiers autorisés, browser, terminal autorisé…), jamais l'inverse : le Core
ne suppose rien qu'un appareil n'a pas déclaré **et** allow-listé localement.

### 3. Device Agent — la pièce manquante ✅ (v0 livrée)
Les tools d'une instance Hermes distante s'exécutent sur la machine qui
héberge Hermes (documenté upstream — voir ADR-001). Le « cerveau ici, mains
là-bas » exige donc un daemon par appareil : `services/device-agent`.

Flux implémenté :

```text
Cockpit/Core → POST /api/jarvis/devices/dispatch
            → Policy Engine (READ/ACT/CRITICAL)
            → file de commandes du device
            → agent (poll mesh privé, secret partagé)
            → allowlist locale de l'appareil
            → exécution réelle → résultat renvoyé au Core
```

Capabilities v0 : `notify` (ACT), `app.launch` (ACT, apps mappées en config),
`presence.ping` (READ). CRITICAL (caméra, terminal, filesystem…) : refusées
sans approbation explicite (HTTP 428) et sans exécuteur v0 — chaque
capability CRITICAL future apportera son exécuteur + son passage de politique
+ son UI d'approbation.

### 4. Réseau privé — jamais de Hermes public
Aucun port du Core exposé sur Internet. Mesh privé chiffré (Tailscale en
pratique : identité + adresse stable par appareil, grants par service ;
variante auto-hébergée à l'étude). **Auth v1 ✅ (ADR-002)** : enrôlement à
code unique depuis le cockpit → **token par appareil** (stocké haché,
comparaison temps constant), identité liée à l'appareil (403 croisé),
**révocation immédiate** depuis le panneau Présence.

### 5. L'identité suit l'utilisateur, pas l'appareil
Séparer USER / SESSION / DEVICE / LOCATION / CONTEXT. Une requête peut porter
`{user, device, session, location, input}` — le Core recompose session
récente + mémoire projet + contexte utilisateur + contexte appareil.
**Livré** : `/api/jarvis/run` accepte `device`/`location`, attache chaque run
à une session (`sessionKey`), et le registre de sessions expose la trace
inter-appareils — continuer sur téléphone une conversation commencée sur PC
fonctionne (sessions Hermes ; l'enrichissement group_ids Graphiti suivra).

### 6. Presence Bus ✅
La présence est dérivée des heartbeats réels du Device Registry (online =
vu depuis < 90 s ; facts : speaker, voiceBridge, + facts déclarés par le
propriétaire comme foreground/headphones — jamais inventés par l'agent).
**Livré** : le routage de réponse (« répondre sur l'enceinte du salon, puis
basculer sur l'appareil actif ») via `/api/jarvis/deliver` — voir brique 5.

### 7. Mobile : pas d'écoute permanente
Android restreint le micro en arrière-plan (foreground service,
while-in-use). Modes retenus : push-to-talk / hands-free au premier plan /
earbuds / notification "Ask JARVIS" / home node (wake word permanent local) /
wearable. L'omniprésence mobile ne repose jamais sur une écoute secrète 24/7.

### 8. Maison : ambiant pour de vrai ✅ (v1)
Petits nodes par pièce : wake word + capture + playback + présence.
Aucun LLM local sur les nodes ; le calcul reste au Core.
**Livré** : `services/home-node` (voir brique 4 ci-dessous) — l'audio ne
quitte jamais la pièce avant le wake, et seul le tour post-wake part vers le
whisper local.

### 9. Mode Core inaccessible — trois niveaux
- **LEVEL 0 — OFFLINE DEVICE** ✅ (v1, voir brique 6) : petit modèle local,
  notes, commandes simples, voix locale, rejeu au retour du Core.
- **LEVEL 1 — CORE CONNECTED** : Hermes, Graphiti, agents, tools, mémoire
  complète.
- **LEVEL 2 — CLOUD BOOST** (optionnel) : gros modèle cloud, deep research,
  vision lourde.
Plus de Wi-Fi maison ne doit jamais signifier plus de JARVIS.

### 10. Portabilité du Core — JARVIS Identity Pack
Le Core est un dossier migrable (compose + volumes) :
`config / models / memory / skills / secrets / backups`. Migration = export
chiffré (mémoire, skills, config, device registry, policies, routines) →
import → redémarrage. Le hardware change, JARVIS reste JARVIS.

## Périmètre P4 complet
Device Registry ✅ · Device Agent ✅(v0) · Presence Bus (v0 heartbeats ✅,
routage à venir) · Secure Mesh (opérationnel via Tailscale, hors code) ·
Session Handoff · Remote Voice · Notifications ✅(capability notify) ·
Offline Fallback · Capability Routing ✅(policy + allowlist) · Encrypted Sync.

## Ordre de construction restant
1. ~~Token par appareil + révocation~~ ✅ (ADR-002).
2. ~~UI d'approbation CRITICAL branchée sur le dispatch~~ ✅ — un dispatch
   CRITICAL depuis le cockpit ouvre `ActionApproval` (FR-009 : cible,
   réversibilité, données affectées) ; rien n'est mis en file avant
   « Approve once », et le refus n'enfile rien.
3. ~~Session handoff~~ ✅ — chaque run appartient à une session
   (`sessionKey` généré et retourné par `/api/jarvis/run`) ; le registre de
   sessions trace les appareils ; le cockpit liste les conversations
   récentes avec « Reprendre ici » (`/lab/intelligence?session=KEY`).
   Prouvé en CI contre un double Hermes : le tour 2 depuis un second
   appareil porte le contexte du tour 1.
4. ~~Home node v1~~ ✅ — `services/home-node` : boucle voix headless
   (`node_voice.py` : mic → wake openWakeWord → tour avec fin par silence →
   whisper.cpp → `voice.final` sur le bus local, relayé entre clients par le
   runtime), pont agent→Core (session persistante par pièce), capability
   `speak` (Piper ou espeak-ng + `playCommand`), facts de présence
   `speaker`/`voiceBridge` dans les heartbeats. Boucle ambiante prouvée en
   direct : transcript → run Core → réponse synthétisée et prononcée.
5. ~~Routage de sortie (Presence Bus)~~ ✅ — `POST /api/jarvis/deliver`
   (voix | notification) : le Core choisit l'appareil d'après les facts de
   présence réels, dans l'ordre continuité de session → préférence
   explicite → appareil au premier plan → enceinte du foyer → récence ;
   refus explicite (503) si aucun appareil capable en ligne. Panneau de
   test dans le cockpit ; la décision et sa raison sont retournées.
6. ~~Offline Level 0~~ ✅ — Core injoignable ≠ satellite muet : petit modèle
   local optionnel (Ollama sur le satellite, réponses annoncées « mode
   dégradé »), intents locaux déterministes (heure, note), file de notes
   hors-ligne (`offline-queue.json`) **rejouée vers le Core à son retour**
   dans la session de la pièce, avec horodatage. Prouvé en direct :
   coupure → intent local répondu + note enregistrée → retour → note
   rejouée puis conversation reprise.
7. Identity Pack : scripts d'export/import chiffrés.
