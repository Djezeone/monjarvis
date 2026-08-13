# JARVIS X2 — P2 Living Interface

P2 turns the visual system into a permission-aware hands-free shell.

## Included
- strict 8-state runtime state machine
- event bus + React external store
- microphone permission manager
- browser AudioWorklet streaming 16-bit / 16 kHz PCM
- openWakeWord-compatible localhost WebSocket adapter
- FastAPI local wake-word/runtime bridge
- whisper.cpp HTTP transcription adapter
- Piper local HTTP TTS adapter
- voice turn recorder
- local runtime WebSocket contract
- READ / ACT / CRITICAL policy classification
- CRITICAL action approval dialog + local approval ledger
- keyboard fallback
- optional camera frame adapter
- gesture adapter contract only (no fake gesture recognition)
- Living Interface Lab
- privacy/security docs
- Claude Code integration guide and master prompt

## Not production-final
The current turn recorder uses a maximum-duration capture. Replace it with proper
VAD/end-of-turn before daily-use production.

The bundled local runtime is a transport/wake-word development bridge, not the final JARVIS brain.

## Start
Read:
1. `CLAUDE_CODE_P2_INTEGRATION.md`
2. `docs/LOCAL_STACK.md`
3. `MASTER_PROMPT_CLAUDE_CODE_P2.md`
