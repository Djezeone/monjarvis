# Source notes verified 2026-09-17

Amont Hermes au moment de cette vérification : **v0.21.3** (tag `v2026.9.14`,
publié le 2026-09-14). La vérification précédente datait du 2026-08-12, soit
avant la v0.21.0 « Pantheon » (tag `v2026.8.31`) — les notes ci-dessous
remplacent celles de cette passe.

Référence : <https://github.com/NousResearch/hermes-agent/releases>

Primary upstreams used for P3 design:

- Hermes Agent API server:
  - default loopback API port 8642
  - bearer authentication required (`Authorization: Bearer …`, clé
    `API_SERVER_KEY`)
  - OpenAI-compatible endpoints
  - Runs API, SSE, stop, approval, jobs, skills/toolsets discovery
  - current docs warn that API server provides full agent tool access
  - surface documentée relevée le 2026-09-17 :
    - runs : `POST /v1/runs`, `GET /v1/runs/{run_id}`,
      `GET /v1/runs/{run_id}/events`, `POST /v1/runs/{run_id}/stop`,
      `POST /v1/runs/{run_id}/approval`
    - jobs : `GET|POST /api/jobs`, `GET|PATCH|DELETE /api/jobs/{job_id}`,
      `POST /api/jobs/{job_id}/{pause,resume,run}`
    - sessions : `GET|POST /api/sessions`,
      `GET|PATCH|DELETE /api/sessions/{id}`, `GET /api/sessions/{id}/messages`,
      `POST /api/sessions/{id}/fork`, `POST /api/sessions/{id}/chat`,
      `POST /api/sessions/{id}/chat/stream`
    - découverte : `GET /v1/models`, `GET /api/model/options`,
      `GET /v1/capabilities`, `GET /v1/skills`, `GET /v1/toolsets`
    - santé : `GET /health` et `GET /v1/health` (non authentifiés, `{"status":
      "ok"}`), `GET /health/detailed` (authentifié, readiness)
    - navigateur : `POST /v1/browser-control/register`,
      `GET /v1/browser-control/ws`
  - événements SSE nommés sur `/v1/runs/{id}/events` : `assistant.delta`,
    `tool.started`, `tool.completed`, `subagent.start`, `subagent.complete`,
    `run.completed`, `run.failed`, `run.cancelled`. Le streaming Chat
    Completions émet en plus `hermes.tool.progress`.
  - drapeaux `/v1/capabilities` : `chat_completions`, `responses_api`,
    `run_submission`, `run_status`, `run_events_sse`, `run_stop`,
    `run_approval`, `session_*`, `browser_extension_control`,
    `session_key_header`, plus les chemins sous `endpoints.*`
  - **aucun endpoint de version** n'est documenté : `/health` ne renvoie qu'un
    statut. La version s'obtient par `hermes --version` en CLI, donc en SSH.
    Toute sonde HTTP qui prétendrait lire la version serait une invention.
  - **à vérifier avant usage** : un `POST /v1/runs/{run_id}/steer` apparaît
    dans des sources secondaires et la v0.21.0 annonce du « live mid-flight
    steering » de la délégation, mais la page officielle de l'API server ne le
    liste pas. Non implémenté côté Core tant que l'amont ne le confirme pas.
- Hermes updates (cf. `deploy/core/HERMES_UPGRADE.md`) :
  - `hermes update` détecte le mode d'installation (installeur git, Docker,
    Nix) et imprime la commande adaptée ; `--check` prévisualise, `--backup`
    force la sauvegarde complète, `--branch` suit un canal non par défaut
  - séquence : instantané → `git pull origin main` → validation syntaxique avec
    rollback automatique → `uv pip install -e ".[all]"` → migration de config →
    reconstruction Desktop → redémarrage drain-first de la passerelle
  - validation amont recommandée : `git status --short`, `hermes doctor`,
    `hermes --version`, `hermes gateway status`
  - Docker refuse la mise à jour en place et renvoie vers
    `docker pull nousresearch/hermes-agent:latest`
  - rupture datée de juillet 2026 : une clé du profil par défaut n'est plus
    acceptée sur un préfixe `/p/<profil>/`, chaque profil doit porter son
    propre `API_SERVER_KEY` sinon `401`
- Hermes local Ollama guide:
  - custom OpenAI-compatible endpoint supported
  - zero API cost/local operation supported
- Hermes MCP/plugin system:
  - external tools via MCP
  - per-server filtering
  - custom Python plugins can register tools
  - n8n exists in the curated MCP catalog
  - v0.21.0 regroupe les serveurs MCP dans un « command center » unique avec
    import par glisser-déposer ; le cron gagne une mémoire persistante
- Graphiti:
  - temporal graph memory with provenance/history
  - local OpenAI-compatible LLM support via OpenAIGenericClient
  - Ollama example with local embedding model
  - structured output reliability depends on model capability
- Browser Use:
  - current agent stack provides browser/computer action space and recovery loops
  - integration remains opt-in in P3 until pinned/sandboxed
- Home Assistant:
  - REST API uses Bearer token
  - WebSocket API available for realtime states
