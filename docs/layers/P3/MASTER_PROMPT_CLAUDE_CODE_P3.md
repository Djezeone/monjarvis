# MASTER PROMPT — JARVIS X2 P3 INTELLIGENCE CORE

Integrate P3 on top of P0 + P1 + P2 and produce a working local-first intelligence core.

## Product invariant

JARVIS X2 is not a chatbot with decorative UI.
It is a Personal Agent OS where:

```text
perception → context → memory → reasoning → policy → delegation → action → verification → memory
```

Every stage must be observable and replaceable.

## Primary brain

Use Hermes Agent through its documented API server.

Prefer the Runs API:
- create `/v1/runs`
- poll `/v1/runs/{id}`
- consume `/v1/runs/{id}/events`
- stop `/v1/runs/{id}/stop`
- resolve approval `/v1/runs/{id}/approval`

Discover features through `/v1/capabilities` instead of assuming every Hermes version
supports every endpoint.

## Local model

Default target:
Ollama → Hermes custom OpenAI-compatible provider.

Do not hardwire one model forever.
Expose model selection in server configuration, not in random UI components.

## Memory

Use Graphiti as temporal memory through the supplied local service/plugin.

Before storing anything, ask:
"Will this still be useful outside the current turn?"

Store durable context, not transcript exhaust.

## Agents

Use Hermes delegation/subagent capabilities rather than building a second orchestration
framework inside Next.js.

Render:
- child started
- child completed/failed/timeout
- short summary
- duration
- token/cost metadata when available

Do not expose private child transcripts unless explicitly requested.

## Tools

### n8n
Treat as credentialed workflow infrastructure.
Only expose allowlisted workflows.

### Home Assistant
Read state first.
Control actions are policy checked.
Locks/alarms/security are CRITICAL.

### Browser
Keep disabled until Browser Use is version-pinned and sandboxed.
Do not weaken this rule just to make the demo look complete.

## Approval

Never equate "Hermes requested a tool" with permission to perform the action.

Approval order:
1. classify tool/action
2. policy decision
3. human approval if required
4. execute
5. verify outcome
6. log sanitized result

## UI behavior

Idle: almost nothing.
Thinking: reveal reasoning activity at high level, not hidden chain-of-thought.
Tool use: show tool name + status + outcome.
Delegation: show child-agent lifecycle.
Approval: interrupt clearly.
Completion: collapse activity into a concise result.

Do not display private model chain-of-thought.
Do display concise progress/status/tool metadata.

## Security

- Hermes key server-side only
- Home Assistant token server-side only
- n8n secrets server-side only
- browser worker token server-side only
- bind local services to 127.0.0.1 by default
- use random secrets, never examples in production
- keep CORS narrow or absent
- sanitize SSE events
- log decisions without logging secrets

## Labs

Maintain:
- `/lab/core`
- `/lab/cinematic`
- `/lab/living`
- `/lab/intelligence`

A lab route may expose diagnostics.
The production `/app` should stay calm and contextual.

## Definition of Done

A voice or typed command can:
1. enter the P2 shell,
2. create a real Hermes run,
3. display progress,
4. optionally delegate,
5. access temporal memory,
6. stop safely,
7. request approval when needed,
8. return the response,
9. optionally speak it,
10. remain functional with zero paid API calls.
