# Operations Runbook

## Startup order
1. Ollama
2. Neo4j
3. Graphiti
4. Hermes
5. P2 local voice services
6. n8n / Home Assistant as required
7. Next.js app

## Health checks
- Hermes `/health`
- Graphiti `/health`
- Browser Worker `/health`
- app `/api/health`

## Incident policy
If an external action tool becomes unreliable, disable the tool; do not hide errors behind optimistic UI.
