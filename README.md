# monjarvis → JARVIS X2

Ce repo évolue vers **JARVIS X2**, un Personal Agent OS local-first (voir `docs/product/PRD_JARVIS_X2.md`). L'audit qui a motivé la restructuration est dans [`AUDIT.md`](AUDIT.md).

## Structure

| Dossier | Contenu |
| --- | --- |
| `apps/web/` | Application Next.js — landing `/`, cockpit `/app`, routes de diagnostic `/lab/*` (FR-014) |
| `assets/manifests/` | Source de vérité visuelle : manifest 77 assets, registre CSV, audit qualité, file de régénération, mapping écrans↔assets |
| `docs/` | PRD, MASTER_BUILD_PROMPT (ordre d'exécution obligatoire), rapport de release du pack d'assets |
| `legacy/clap-listener/` | Outil desktop d'origine (double-clap → Spotify/Chrome/TTS/Cursor), conservé tel quel |

## Démarrer l'app web

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run build      # vérification de compilation
npm run generate:assets   # régénère src/lib/assets.ts depuis le manifest
```

## État actuel (honnête)

- ✅ `/app` compile ; machine à huit états du Core (FR-001) implémentée et validée.
- ✅ Registre canonique `assets.ts` généré depuis le manifest (invariant assets).
- ⚠️ **Les binaires des 77 assets ne sont pas dans le repo** — seuls les manifests le sont. Les routes `/lab/*` affichent l'état réel (binaire « manquant ») tant que le pack n'est pas importé dans `apps/web/public/assets/`.
- ⚠️ Aucun organe backend (Hermes, Ollama, Graphiti, whisper.cpp, Piper, n8n, Home Assistant) n'est connecté : le cockpit les affiche « non connecté » plutôt que de les simuler (invariant « do not fake »).

Prochaines étapes : voir `AUDIT.md` §4 et `docs/build/MASTER_BUILD_PROMPT.md`.
