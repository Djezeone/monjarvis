# Audit — repo `monjarvis` vs cible « JARVIS X2 »

**Date : 2026-08-13** · Audit réalisé avant toute action, sur (1) le contenu du repo et (2) les 8 fichiers joints du « JARVIS X2 MASTER ASSET PACK » v1.0.0.

## 1. État du repo avant intervention

Le repo contenait un seul programme : `jarvis.py` (~930 lignes), un écouteur de **double-clap** desktop (Windows-centric) qui, au déclenchement, ouvre Spotify, Chrome (Claude + Binance sur des moniteurs choisis), joue un message de bienvenue ElevenLabs (avec cache WAV) et met Cursor au premier plan.

Constats :

| Point | Verdict |
| --- | --- |
| Fonctionnalité | Autonome et cohérente, code soigné (debounce, noise floor adaptatif, gestion Win32 propre) |
| Rapport avec la vision « Jarvis X2 » | **Aucun** — c'est un lanceur d'ambiance, pas un agent |
| Docstring | Se référait à `clap_listen.py` alors que le fichier s'appelle `jarvis.py` |
| Hygiène | `__pycache__/` commité ; `.gitignore` minimal |
| Sécurité | Correcte : secrets via `.env`, non commités |

## 2. Audit des fichiers joints

Les joints décrivent un produit radicalement plus ambitieux : un **Personal Agent OS local-first** (PRD v1.0), avec stack Next.js/R3F, Hermes (core agent), Ollama, Graphiti+Neo4j, whisper.cpp, Piper, n8n, Home Assistant, et un pack de 77 assets visuels.

Cohérence interne des joints : **bonne**.
- `assets-manifest.json`, `assets-register.csv` et `quality-audit.csv` sont alignés : 77 assets, 60 grade A / 17 grade B / 0 grade C — conforme au FINAL_RELEASE_REPORT.
- `regeneration-queue.csv` : 60 IDs attendus, dont **31 `missing_exact_asset` (P0)** et 29 couverts par un asset existant.
- `screen-asset-mapping.json` : 13 routes mappées ; tous les IDs référencés existent dans le registre.

**Lacunes bloquantes** — le pack livré ici est *incomplet* par rapport à ce que le MASTER_BUILD_PROMPT suppose présent :

1. **Aucun binaire d'asset** : les 77 PNG/WebP/thumbnails référencés par chemins (`/assets/production/...`) ne sont pas fournis — seulement leurs métadonnées.
2. **Sources P0→P3 absentes** (Visual Foundation, Cinematic, Living Interface, Intelligence Core) ainsi que `README_FIRST.md`, les docs sécurité, la banque de recherche open source et `SHA256SUMS.txt`.
3. Le fichier `assets.ts` canonique exigé par l'invariant assets n'existait pas.

## 3. Décision : améliorer, pas « remplacer à l'aveugle »

Le MASTER_BUILD_PROMPT impose : *« Do not build a visual demo that fakes backend capabilities »*. Sans binaires d'assets ni sources P0→P3, livrer « Jarvis X2 complet » serait précisément cela. Décision prise :

- **Conserver** le clap-listener (seule brique fonctionnelle) en le déplaçant dans `legacy/clap-listener/`, docstring corrigée, `__pycache__` retiré du suivi.
- **Restructurer** le repo en fondation Jarvis X2 :
  - `docs/` — PRD, MASTER_BUILD_PROMPT, FINAL_RELEASE_REPORT versionnés dans le repo ;
  - `assets/manifests/` — les 5 manifests (source de vérité visuelle) ;
  - `apps/web/` — application Next.js **qui compile** (étape 5 de l'ordre d'exécution obligatoire) : routes `/`, `/app`, `/lab/core`, `/lab/cinematic`, `/lab/living`, `/lab/intelligence` (FR-014) ;
  - `apps/web/src/lib/assets.ts` — registre canonique **généré** depuis le manifest (77 IDs typés) via `npm run generate:assets` ;
  - machine à huit états du Core (FR-001) réelle et validée côté code (`core-state.ts`), transitions illégales refusées ;
  - diagnostics labs honnêtes : chaque route lab vérifie registre + présence réelle du binaire et affiche « manquant » tant que le pack n'est pas importé (NFR-004 : fallbacks explicites) ;
  - panneau « Organes » du cockpit : Hermes, Ollama, Graphiti, whisper.cpp, Piper, n8n, Home Assistant, browser worker — tous affichés **non connectés** tant que l'adapter réel n'est pas branché. Rien n'est simulé.

## 4. Prochaines étapes (ordre du MASTER_BUILD_PROMPT)

1. **Importer les binaires du pack** dans `apps/web/public/assets/{production,web,thumbnails}/…` — les diagnostics labs passeront au vert d'eux-mêmes.
2. Fournir les sources P0→P3 + docs sécurité (absentes des joints).
3. Brancher Hermes (routes server-only), puis Ollama pour l'inférence locale.
4. Graphiti + Neo4j : prouver écriture/rappel mémoire.
5. Stop + approval gate (FR-009), puis un workflow n8n allowlisté, puis Home Assistant en lecture seule.
6. Traiter la file de régénération : 31 assets P0 manquants à produire.
7. Seulement ensuite : polish cinématique 3D (R3F) sur `/`, dans le respect de « cinématique à l'entrée, calme à l'usage ».

---

## 5. Addendum — 2026-08-13 (2e livraison de fichiers)

Les 12 archives manquantes ont été fournies (binaires d'assets par catégorie + `00_JARVIS_X2_DOCS_SOURCES_P0_P3.zip`). Vérifications effectuées avant intégration :

- **Intégrité parfaite** : 77 assets × 3 fichiers (PNG master, WebP, thumbnail) tous présents, tailles conformes au registre, **493/493 empreintes SHA-256 valides**, aucun binaire orphelin.
- Le pack contient `README_FIRST.md`, la documentation complète (sécurité, technique, UX, opérations), `claude-code/` (BOOTSTRAP, ASSET_INTEGRATION_GUIDE) et les sources P0→P3 — tout ce qui manquait au §2.
- `archives/` (4 mockups legacy en quarantaine + packs historiques) volontairement non importé, conformément aux règles de production.

Intégration réalisée (ordre BOOTSTRAP : P0 → P1 → P2 → P3, build vérifié à chaque couche) :

1. **Assets** : WebP + thumbnails dans `apps/web/public/assets/`, masters dans `assets/production/`, SVG/audio P0-P1 (icônes, textures, fallbacks, beds audio) dans `public/assets/`.
2. **P0 Visual Foundation** : Core 3D (R3F + shaders GLSL), dock hands-free, constellation mémoire/agents, curseur magnétique, design tokens — sous `apps/web/src/jarvis/`.
3. **P1 Cinematic** : `CinematicExperience` (intro skippable, ScrollDirector, mondes 3D lazy, fallback sans WebGL) monté sur `/`.
4. **P2 Living Interface** : machine à états runtime (9/9 cas de test du pack passent), adapters voix (wake word WebSocket, whisper.cpp, Piper), centre de permissions, approbations CRITICAL, worklet PCM — lab sur `/lab/living`.
5. **P3 Intelligence Core** : `JarvisIntelligenceService` server-only + adapters (Hermes, Graphiti, Home Assistant, n8n, Browser worker) + Policy Engine ; routes API `/api/jarvis/{run,run/[id],stop,approval,stream,health}` avec proxy SSE assainissant — lab sur `/lab/intelligence`.
6. **Services locaux** : `services/voice-runtime` (P2), `services/local-stack` (Graphiti+Neo4j docker, browser worker), `services/hermes` (config Ollama + plugin jarvis-memory).
7. Corrections de compatibilité minimales (React 19/TS strict) : `useRef` sans argument, cleanups d'effets retournant un booléen, typage des configs d'états et des headers — le design visuel n'a pas été modifié.

Reste à faire (nécessite les services tournant en local) : démarrer Ollama/Hermes/Graphiti et prouver le parcours complet (run réel, rappel mémoire, stop, approbation), activer un workflow n8n allowlisté, lecture Home Assistant, tests E2E du TEST_PLAN.

---

## 6. Addendum — 2026-08-13 (poursuite de l'ordre d'exécution, post-merge PR #1)

Étapes du MASTER_BUILD_PROMPT traitées dans cette itération :

- **Étape 7 (huit états validés)** : cas de test étendus (`state-machine-cases.extended.json`) — 29/29 passent, couverture garantie des 8 états + rejets d'événements hors-ordre + comportements `reset`/`warning`.
- **Étape 9 (machine vocale P2 connectée)** : `JarvisRuntimeProvider` — adapter WebSocket **singleton** au niveau du shell (fix d'intégration exigé par le guide P2), connexion uniquement sur choix explicite de l'utilisateur, événements pipés vers `jarvisEventBus`, injection par contexte. `LivingInterfaceOverlay` et `LivingInterfaceLab` consomment le contexte (plus aucune connexion par composant). Overlay + contrôle de connexion montés dans `/app`.
- **Étape 16 (tests mobile/clavier/reduced-motion/no-WebGL)** : suite Playwright (`npm run test:e2e`, 19/19) contre le build de production — viewport iPhone, navigation Tab (NFR-005), `prefers-reduced-motion`, WebGL bloqué → fallback FR-012, labs sans erreur d'exécution, `/app` chargeant sans aucun organe configuré (NFR-004).
- **Étapes 11-12 (préparées)** : `scripts/verify-local-stack.mjs` — preuve réelle à exécuter sur la machine hôte : santé Hermes/Graphiti, écriture + rappel mémoire (avec retry d'ingestion), run réel → complétion, stop d'un run en cours, route d'approbation. Aucune simulation ; chaque échec est rapporté tel quel.

Bugs réels détectés et corrigés par les tests :
1. **Landmarks `<main>` imbriqués** (layout + composants pack) — violation d'accessibilité corrigée (`<section>` dans les composants).
2. **Dépendance CDN cachée** : `<Environment preset="night"/>` téléchargeait `dikhololo_night_1k.hdr` depuis un CDN — remplacé par le même HDR servi localement (`public/assets/textures/`), conformément au principe local-first.

Étapes restant tributaires de la machine hôte : 10-12 en conditions réelles (Hermes/Ollama/Graphiti up → `node scripts/verify-local-stack.mjs`), 13 (un workflow n8n allowlisté), 14 (Home Assistant lecture seule), puis P4.

---

## 7. Addendum — 2026-08-14 : P4 OMNIPRESENCE FABRIC livré

L'architecture Core + Satellites proposée (voir spec `docs/product/P4_OMNIPRESENCE_FABRIC.md`, ADR-001/002) est intégralement implémentée, une brique par PR, chacune testée et prouvée en direct :

| Brique | Livraison | Preuve |
| --- | --- | --- |
| 1. Tokens par appareil | Enrôlement à code unique, hash SHA-256, isolation 403, révocation immédiate (ADR-002) | Agent réel : enrôlement → token 0600 → révocation coupe l'agent |
| 2. Porte d'approbation CRITICAL | Dispatch 428 → `ActionApproval` (FR-009) → `approvedBy` tracé au registre | Parcours UI E2E complet (deny n'enfile rien) |
| 3. Session handoff | `sessionKey` sur chaque run, registre de sessions, « Reprendre ici » | Tour 2 depuis `phone-s24` porte le contexte du tour 1 (double Hermes) |
| 4. Home node v1 | Boucle voix headless (wake→tour→whisper→bus), pont → run Core, `speak` (Piper/espeak) | Boucle ambiante complète jusqu'au WAV synthétisé |
| 5. Routage de sortie | `/api/jarvis/deliver` : continuité > préférence > premier plan > enceinte > récence ; 503 honnête | 5 tests E2E, commande dans la file de l'appareil routé |
| 6. Offline Level 0 | Intents locaux, modèle local optionnel, notes rejouées au retour du Core | Coupure réelle : heure répondue localement, note rejouée au retour |
| 7. Identity Pack | Export/import chiffré scrypt+AES-256-GCM des registres du Core | Octet altéré → refus GCM ; import fidèle (SHA-256 identiques) |

Suite de tests : **38/38** (desktop + mobile, reduced-motion, sans WebGL, contrat du fabric, approbations, handoff, routage). Prochaine phase : **P5 — Personalization / Self-Evolution**, maintenant que JARVIS peut être partout avec l'utilisateur.
