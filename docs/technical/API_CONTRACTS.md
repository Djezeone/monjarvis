# API & Event Contracts

## Core Run
- `POST /api/jarvis/run`
- `GET /api/jarvis/run/:id`
- `POST /api/jarvis/run/:id/stop`
- `POST /api/jarvis/run/:id/approval`
- `GET /api/jarvis/run/:id/events` — sanitized SSE proxy

## Runtime events
- `runtime.connected`
- `wake.detected`
- `voice.start`
- `voice.partial`
- `voice.final`
- `reasoning.start`
- `action.requested`
- `action.started`
- `action.completed`
- `action.failed`
- `speech.start`
- `speech.end`
- `warning`
- `reset`

## Principle
Le navigateur ne reçoit jamais les clés Hermes, n8n ou Home Assistant.
