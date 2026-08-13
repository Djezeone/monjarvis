# Claude Code Integration — P2 Living Interface

Requires P0 + P1.

## Copy
```text
runtime/
components/living/
components/permissions/
components/approvals/
components/vision/
components/lab/
public/worklets/
styles/living-interface.css
```

Import the CSS once.

## Route
Create `/lab/living` rendering:
```tsx
import { LivingInterfaceLab } from "@/components/jarvis/components/lab/LivingInterfaceLab";
```

Adjust import paths to the target repository layout rather than duplicating components.

## Start local services
Read `docs/LOCAL_STACK.md`.

P2 assumes defaults:
- JARVIS runtime / wake: `127.0.0.1:8765`
- whisper.cpp: `127.0.0.1:8080/inference`
- Piper: `127.0.0.1:5000/synthesize`

Make endpoints configurable through server-provided public config.

## Important integration fix
`LivingInterfaceOverlay` creates a runtime adapter but does not connect it automatically.
At application-shell level:
1. create one singleton runtime adapter;
2. connect it after explicit user choice / local availability check;
3. subscribe its events to `jarvisEventBus`;
4. inject it through context.

Do not create multiple WebSocket connections per component in production.

## P2 PoC voice path
1. User clicks Enable hands-free.
2. Browser requests microphone permission.
3. AudioWorklet streams 16 kHz PCM to local wake server.
4. Wake event changes state.
5. A short user turn is recorded.
6. Blob is posted to whisper.cpp.
7. Transcript is emitted to the future reasoning runtime.
8. Future response can be spoken through Piper.
9. UI returns to idle.

## Production upgrade
Replace max-duration voice-turn recording with proper VAD/end-of-turn detection.
Do not ship the simple 9-second recorder as final UX.

## Wake model license
Never silently bundle openWakeWord pretrained models into a commercial build.
Read `docs/LOCAL_STACK.md`.

## Definition of done
- local runtime health endpoint responds
- wake socket receives PCM
- microphone turns off correctly
- transcript reaches UI
- warning state handles unavailable services
- CRITICAL demo opens approval dialog
- keyboard fallback works
- camera remains off by default
- P0/P1 routes remain unaffected
