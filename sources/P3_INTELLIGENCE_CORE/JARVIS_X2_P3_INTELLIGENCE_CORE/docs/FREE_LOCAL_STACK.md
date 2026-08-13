# JARVIS X2 — Free/Local Intelligence Stack

## Primary path

```text
Ollama
  ↓
Hermes Agent :8642
  ├── skills
  ├── built-in tools
  ├── subagents
  ├── cron/jobs
  └── JARVIS Memory plugin
          ↓
Graphiti Memory :8771
          ↓
Neo4j :7687
```

Additional organs:

```text
n8n :5678              → workflows / credentials / integrations
Home Assistant :8123   → physical world
Browser Worker :8772   → optional isolated Browser Use boundary
P2 Voice               → wake / STT / TTS
```

## 1. Ollama

Install Ollama separately, then pull models.

Suggested starting points:

```bash
ollama pull qwen3.5:27b
ollama pull qwen3.5:9b
ollama pull nomic-embed-text
```

Hardware too small?
Use a smaller tool-capable model for Hermes, but preserve a large context window where possible.
Hermes documentation recommends a large agent context; small context windows will degrade tool use and long sessions.

## 2. Hermes Agent

Use the official Hermes installation instructions.

Copy:
`hermes/config.local-ollama.example.yaml`
into the appropriate Hermes config location, adapting model names to the local hardware.

Set a random `API_SERVER_KEY`.

Start:

```bash
hermes gateway
```

Expected default API:
`http://127.0.0.1:8642`

Verify:

```bash
curl http://127.0.0.1:8642/health
```

Do not expose port 8642 publicly.

## 3. Graphiti memory

```bash
cd local-stack
docker compose -f docker-compose.memory.yml up -d

python -m venv .venv
# activate it
pip install -r requirements-memory.txt
python -m uvicorn graphiti_service:app --host 127.0.0.1 --port 8771
```

Graphiti uses local Ollama:
- inference: configurable `GRAPHITI_LLM_MODEL`
- embeddings: `nomic-embed-text`

Start with `SEMAPHORE_LIMIT=2` on consumer hardware.

If structured extraction fails, try:
`GRAPHITI_STRUCTURED_OUTPUT_MODE=json_object`

Graphiti works best with models that reliably emit structured JSON.
Do not assume the smallest local model will be reliable enough.

## 4. Hermes → Graphiti plugin

Copy:

```text
hermes/plugins/jarvis-memory
```

to:

```text
~/.hermes/plugins/jarvis-memory
```

Set:

```text
JARVIS_GRAPHITI_URL=http://127.0.0.1:8771
```

Enable:

```bash
hermes plugins enable jarvis-memory
```

Restart Hermes.

The agent then receives:
- `jarvis_memory_search`
- `jarvis_memory_remember`

## 5. n8n

Keep n8n credentials inside n8n.

P3's direct adapter uses an allowlisted webhook architecture:
server → n8n webhook → credentialed workflow.

Hermes also currently ships a curated MCP catalog entry for n8n, so this can later
be connected directly to Hermes with:
`hermes mcp install n8n`

Do not expose every destructive n8n capability to the model.

## 6. Home Assistant

Preferred first implementation:
configure `HASS_TOKEN` for Hermes and use Hermes' dedicated Home Assistant tools.

P3 also includes a server-only REST adapter for custom policy control.

Security domains such as locks and alarm panels remain CRITICAL.

## 7. Browser automation

P3 deliberately ships a non-executing Browser Worker shell first.

Why:
browser automation is a high-authority capability and Browser Use is rapidly evolving.

Before enabling:
1. pin a tested Browser Use version;
2. sandbox the worker;
3. implement domain allowlists;
4. enforce max steps/time;
5. redact secrets;
6. route irreversible actions to approval.

## Zero-cost target

Normal daily path can be:
- local Ollama inference
- local Graphiti
- local Neo4j
- local voice
- self-hosted n8n
- local Home Assistant
- local browser worker

Cloud APIs become optional accelerators rather than requirements.
