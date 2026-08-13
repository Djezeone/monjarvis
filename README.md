# monjarvis → JARVIS X2

Ce repo évolue vers **JARVIS X2**, un Personal Agent OS local-first (voir `docs/product/PRD_JARVIS_X2.md`). L'audit qui a motivé la restructuration est dans [`AUDIT.md`](AUDIT.md).

## Structure

| Dossier | Contenu |
| --- | --- |
| `apps/web/` | Application Next.js — landing cinématique `/`, cockpit `/app`, labs `/lab/*` (FR-014), routes API server-only `/api/jarvis/*` |
| `apps/web/src/jarvis/` | Couches P0→P3 intégrées : composants 3D/UI, runtime voix, machine à états, adapters Hermes/Graphiti/HA/n8n, Policy Engine |
| `assets/` | Masters PNG (`production/`), contact sheets (`previews/`), manifests (source de vérité, 77 assets) |
| `services/` | Stacks locales : `voice-runtime` (wake word Python), `local-stack` (Graphiti+Neo4j, browser worker), `hermes` (config + plugin mémoire) |
| `docs/` | Documentation complète : produit, sécurité (threat model, memory policy), technique (API contracts), UX, opérations, docs de couches P0→P3 |
| `legacy/clap-listener/` | Outil desktop d'origine (double-clap → Spotify/Chrome/TTS/Cursor), conservé tel quel |

## Démarrer l'app web

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run build      # vérification de compilation
npm run test:state # cas de test de la machine à états (pack P2)
npm run generate:assets   # régénère src/lib/assets.ts depuis le manifest
cp .env.example .env.local   # puis renseigner HERMES_API_KEY etc.
```

## État actuel (honnête)

- ✅ Pack d'assets complet importé et **vérifié** (77 assets, 493 SHA-256 conformes) ; WebP runtime servis depuis `public/assets/`.
- ✅ Couches P0→P3 intégrées et compilées : Core 3D huit états (shaders GLSL), expérience cinématique `/`, interface vivante (voix/permissions/approbations), labs branchés sur les vrais composants.
- ✅ Routes API server-only `/api/jarvis/*` : run, statut, stop, approbation, proxy SSE assainissant, santé des organes. Les secrets (HERMES_API_KEY…) ne quittent jamais le serveur.
- ✅ Machine à états P2 validée : 9/9 cas du pack passent (`npm run test:state`).
- ⚠️ Les organes (Hermes, Ollama, Graphiti+Neo4j, whisper.cpp, Piper, n8n, Home Assistant) sont intégrés côté adapters mais **doivent tourner localement** pour passer « connecté » — démarrage : `services/` + `docs/operations/LOCAL_FIRST_DEPLOYMENT.md`. Le panneau Organes du cockpit reflète leur état réel via `/api/jarvis/health`, rien n'est simulé.
- ⚠️ Browser worker désactivé par défaut tant que la sandbox n'est pas validée (invariant sécurité).

Prochaines étapes : voir `AUDIT.md` §4 et `docs/build/MASTER_BUILD_PROMPT.md`.
