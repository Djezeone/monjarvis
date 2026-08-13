# MASTER PROMPT — JARVIS X2 P2 LIVING INTERFACE

Integrate P2 on top of the existing P0 + P1 system.

## Product goal
JARVIS X2 should become usable without mouse or keyboard while remaining fully usable
with touch, keyboard and pointer.

Do not confuse "hands-free" with "always recording without consent".

## Non-negotiable behavior
- mic OFF by default
- camera OFF by default
- explicit permission before capture
- visible active microphone state
- visible local/cloud status
- Escape always cancels current interaction
- Ctrl/Cmd + Space provides push-to-talk fallback
- voice state is driven by runtime events, not animations
- CRITICAL actions never auto-approve

## First milestone
Make `/lab/living` pass:
1. connect to local runtime
2. enable microphone
3. wake-word event is visible
4. transcript reaches the UI
5. service failure shows warning state
6. CRITICAL test shows approval gate
7. disable hands-free stops microphone tracks

## Architecture cleanup before production
Create singleton services:
- `JarvisRuntimeService`
- `VoiceService`
- `PermissionService`
- `ApprovalService`

Inject services through context/hooks.
The supplied component-local adapter creation is POC code, not the final dependency lifecycle.

## Local-first stack
- openWakeWord for wake detection in dev/personal use
- whisper.cpp for STT
- Piper for TTS
- future Hermes/JARVIS Core for reasoning
- optional LiveKit later for cross-device realtime media

Keep all adapters replaceable.

## Commercial-license guard
The openWakeWord code is permissive, but its included pretrained models are non-commercial.
Do not package those pretrained models into a commercial distribution.
Piper is GPL; review packaging/distribution strategy before bundling.

## Do not fake
- gesture recognition
- gaze tracking
- emotional detection
- continuous environmental understanding
P2 provides interfaces for future vision, not fabricated capabilities.

## UI
Living Interface should feel quieter as capability increases.
When idle, show almost nothing.
On wake, surface transcript.
On action, surface only relevant context.
On CRITICAL, interrupt clearly.

## Performance/privacy
- wake pipeline sends only local PCM to localhost
- no raw audio persistence by default
- no camera frames stored by default
- release MediaStream tracks after use
- handle background tab
- avoid multiple AudioContexts
- prevent multiple wake listeners
- add reconnect backoff to local runtime

## Production backlog
- proper VAD/end-of-turn
- barge-in while TTS is speaking
- echo cancellation testing
- multi-room identity/device routing
- French custom wake model
- device-local hotword model with commercial-safe training data
- optional gesture adapter
- optional presence detection
- offline installer

## Definition of Done
P2 behaves as a real permission-aware hands-free shell, not a visual mock.
