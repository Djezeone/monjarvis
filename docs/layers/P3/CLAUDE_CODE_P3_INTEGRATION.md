# Claude Code Integration — P3 Intelligence Core

Requires P0 + P1 + P2.

## Objective

Connect the Living Interface to a real server-side agent core while preserving:
- local-first operation
- secret isolation
- explicit approval for critical actions
- adapter boundaries
- independent failure of each organ

## Required architecture

```text
Browser
  ↓
Next.js server routes
  ↓
JarvisIntelligenceService
  ├── HermesRunsAdapter
  ├── GraphitiRestAdapter
  ├── N8nWebhookAdapter
  ├── HomeAssistantAdapter
  └── BrowserWorkerAdapter
```

Never instantiate `HermesRunsAdapter` with its API key in a client component.

## Build order

1. Copy P3.
2. Import `components/intelligence/intelligence.css`.
3. Create server-side env vars from `local-stack/.env.example`.
4. Add server route `/api/jarvis/run`.
5. Add run status route.
6. Add stop route.
7. Add approval route.
8. Add SSE proxy route.
9. Mount `/lab/intelligence`.
10. Verify Hermes health.
11. Start Graphiti memory and verify `/health`.
12. Install/enable `jarvis-memory` Hermes plugin.
13. Verify Hermes `/v1/toolsets` lists the plugin.
14. Test an ordinary read-only run.
15. Test a delegated/subagent run.
16. Test a run requiring approval.
17. Only then enable n8n write workflows.
18. Only then enable Home Assistant control.
19. Browser automation stays disabled until separately sandboxed.

## SSE

The provided `HermesRunsAdapter.streamRun()` consumes Hermes SSE correctly
server-side. Do not pass the Hermes bearer token to the browser.

Create a sanitizing proxy that forwards only:
- assistant text deltas
- safe tool name/status
- subagent lifecycle
- run status
- sanitized approval metadata

Never forward:
- environment variables
- shell command secret values
- credential values
- full sensitive tool arguments

## Memory policy

Write to Graphiti only when content is durable:
- explicit preference
- stable identity/profile data
- decision
- procedure
- meaningful event
- project state change

Do not store every utterance as a durable fact.

Recommended scopes:
- `jarvis-primary`
- `project:<id>`
- `person:<id>` only where appropriate and consented

## Autonomy

Hermes Jobs API is the preferred Core scheduler.
Use n8n when the scheduled task primarily orchestrates external services.

Rule:
- reasoning schedule → Hermes Job
- deterministic integration workflow → n8n
- physical automation → Home Assistant
- mixed workflow → policy-gated orchestration

## Definition of Done

- P0/P1/P2 still compile.
- `/lab/intelligence` uses real server routes.
- Hermes API secret is server-only.
- local model can answer through Hermes.
- memory can be written/recalled.
- run stop works.
- run approval works.
- subagent lifecycle reaches UI.
- no external write tool is enabled by default.
- Browser Worker reports `needs-executor` until separately activated.
