# P2 Living Interface Architecture

```text
Browser UI
│
├── LivingVoiceController
│   ├── microphone permission
│   ├── PCM 16 kHz worklet ───────┐
│   ├── turn recorder              │
│   └── state display              │
│                                  ▼
│                           Local Runtime :8765
│                           ├── /wake websocket
│                           │    └── openWakeWord
│                           └── /events websocket
│
├── WhisperCppAdapter ───────────→ whisper-server :8080
│                                  └── /inference
│
├── PiperHttpAdapter ────────────→ piper HTTP :5000
│                                  └── /synthesize
│
├── RuntimeAdapter ──────────────→ future Hermes/JARVIS Core
│
└── ActionApproval
    └── policy gate before CRITICAL actions
```

## Separation rules

### UI state is not authority
`acting` only means that the interface displays execution state.
It never grants permission.

### Wake word is not transcription
Wake detection receives continuous short PCM frames.
Full user speech is recorded only after activation.

### STT/TTS are replaceable
Any local/cloud provider can implement the same adapter surface.

### Vision is opt-in
P2 supplies a camera-frame adapter and a gesture contract but does not enable
camera capture or recognition by default.

### Runtime is separate
The bundled FastAPI bridge is a development transport/wake-word service, not the
final reasoning brain.
