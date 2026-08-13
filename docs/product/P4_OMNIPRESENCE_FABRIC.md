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
**v0 livrée** : `/api/jarvis/run` accepte `device` et `location` et les
transmet au run. Le handoff complet (continuer sur téléphone une conversation
commencée sur PC) s'appuiera sur les sessions Hermes + group_ids Graphiti.

### 6. Presence Bus
v0 : la présence est dérivée des heartbeats réels du Device Registry (online
= vu depuis < 90 s ; facts libres : foreground, headphones…). Le bus de
routage de réponse (« répondre sur l'enceinte du salon, puis basculer sur le
téléphone ») est l'étape suivante ; il choisira la sortie d'après ces facts.

### 7. Mobile : pas d'écoute permanente
Android restreint le micro en arrière-plan (foreground service,
while-in-use). Modes retenus : push-to-talk / hands-free au premier plan /
earbuds / notification "Ask JARVIS" / home node (wake word permanent local) /
wearable. L'omniprésence mobile ne repose jamais sur une écoute secrète 24/7.

### 8. Maison : ambiant pour de vrai
Petits nodes par pièce : wake word + VAD + capture + playback + présence.
Aucun LLM local sur les nodes ; le calcul reste au Core
(`services/voice-runtime` est la base du node).

### 9. Mode Core inaccessible — trois niveaux
- **LEVEL 0 — OFFLINE DEVICE** : petit modèle local, notes, commandes
  simples, cache mémoire, voix locale.
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
3. Session handoff : reprise d'une session Hermes depuis un autre device.
4. Home node v1 : `voice-runtime` + `presence` sur un node dédié.
5. Routage de sortie (Presence Bus) : choisir l'appareil de réponse.
6. Offline Level 0 : petit modèle local + cache sur satellite.
7. Identity Pack : scripts d'export/import chiffrés.
