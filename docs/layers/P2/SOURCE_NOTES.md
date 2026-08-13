# Primary source notes — verified 2026-08-12

## openWakeWord
Repository: https://github.com/dscripka/openWakeWord
- browser → WebSocket streaming examples exist
- input documented as 16-bit 16 kHz PCM
- 80 ms frame multiples recommended
- code: Apache-2.0
- included pretrained models: CC BY-NC-SA 4.0

## whisper.cpp
Repository: https://github.com/ggml-org/whisper.cpp
- `whisper-server` provides HTTP transcription
- default inference path: `/inference`
- multipart `file` upload
- `--convert` converts non-WAV audio with ffmpeg
- VAD parameters are available in the server

## Piper
Repository: https://github.com/OHF-Voice/piper1-gpl
- local neural TTS
- HTTP server supported
- default documented `/synthesize` endpoint
- current repository license: GPL-3.0-or-later

## LiveKit Agents
Repository: https://github.com/livekit/agents
- optional later realtime/cross-device media layer
- MCP support
- self-hostable stack
