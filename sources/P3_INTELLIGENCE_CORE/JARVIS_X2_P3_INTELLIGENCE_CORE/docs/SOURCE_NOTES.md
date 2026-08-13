# Source notes verified 2026-08-12

Primary upstreams used for P3 design:

- Hermes Agent API server:
  - default loopback API port 8642
  - bearer authentication required
  - OpenAI-compatible endpoints
  - Runs API, SSE, stop, approval, jobs, skills/toolsets discovery
  - current docs warn that API server provides full agent tool access
- Hermes local Ollama guide:
  - custom OpenAI-compatible endpoint supported
  - zero API cost/local operation supported
- Hermes MCP/plugin system:
  - external tools via MCP
  - per-server filtering
  - custom Python plugins can register tools
  - n8n exists in the curated MCP catalog
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
