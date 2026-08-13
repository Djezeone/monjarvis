# Technical Architecture

```text
Browser / App
│
├─ Presentation
│  ├─ Core 3D
│  ├─ Cinematic
│  └─ Living Interface
│
├─ Next.js Server Boundary
│  ├─ auth
│  ├─ sanitizing SSE proxy
│  └─ policy gateway
│
└─ Intelligence Core
   ├─ Hermes Agent
   │  ├─ runs
   │  ├─ subagents
   │  ├─ jobs
   │  └─ skills/tools
   ├─ Graphiti + Neo4j
   ├─ Ollama / LocalAI
   ├─ n8n
   ├─ Home Assistant
   └─ Browser Worker
```

## Invariant
**Presentation state is never execution authority.**

## Adapter boundaries
- `IntelligenceAdapter`
- `MemoryAdapter`
- `VoiceAdapter`
- `RuntimeAdapter`
- `VisionAdapter`
- Browser worker API
- n8n workflow boundary
- Home Assistant server adapter
