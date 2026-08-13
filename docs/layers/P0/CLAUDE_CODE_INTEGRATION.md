# JARVIS X2 — P0 Visual Foundation
## Claude Code Integration Contract

This pack is intentionally **visual-system first**. It contains reusable UI/3D primitives and assets.
It does **not** implement the real AI runtime, microphone capture, speech recognition, permissions, or computer control.

## 1. Install dependencies

Merge `package.fragment.json` into the application's `package.json`.

```bash
npm i three @react-three/fiber @react-three/drei motion
npm i -D @types/three
```

Copy `types-glsl.d.ts` to the project root or `src/types/`.

Merge the GLSL loader from `next.config.fragment.mjs` into the existing Next config.

## 2. Copy folders

```text
public/assets/         → <app>/public/assets/
components/            → <app>/components/jarvis/
shaders/               → <app>/shaders/
config/                 → <app>/config/
styles/jarvis-x2.css   → <app>/styles/jarvis-x2.css
```

Import the CSS once from the root layout:

```tsx
import "@/styles/jarvis-x2.css";
```

## 3. First visible integration

Render:

```tsx
import { JarvisP0DemoPage } from "@/components/jarvis/ui/JarvisP0DemoPage";

export default function Page(){
  return <JarvisP0DemoPage />;
}
```

## 4. State machine contract

The visual system only needs one state:

```ts
type JarvisState =
  | "idle"
  | "wake"
  | "listening"
  | "understanding"
  | "thinking"
  | "acting"
  | "speaking"
  | "warning";
```

The future voice/runtime layer must emit these states.
Do not couple the 3D Core directly to LiveKit, Hermes, Ollama or n8n.

Recommended architecture:

```text
Runtime events
     ↓
Jarvis UI Store
     ↓
JarvisState
     ↓
Core / Voice Dock / Cursor / Ambient UI
```

## 5. Hands-free integration contract

Replace the `HandsFreeDock` demo toggle with an adapter:

```ts
interface VoiceAdapter {
  state: JarvisState;
  transcript?: string;
  wakePhrase: string;
  enable(): Promise<void>;
  disable(): Promise<void>;
  mute(): void;
}
```

Target runtime candidates:
- LiveKit Agents: realtime voice session
- whisper.cpp: local STT
- Piper/Kokoro: local TTS
- openWakeWord: local wake phrase

Never start microphone capture without explicit browser/device permission.

## 6. Action safety

Visual state `acting` MUST NOT imply permission to perform arbitrary actions.

Use an external policy gate:

```text
READ       → auto where safe
ACT        → reversible actions, policy checked
CRITICAL   → explicit confirmation required
```

Examples of CRITICAL:
payments, deletion, public publishing, credentials, legal submissions,
production mutations, security controls, locks/doors.

## 7. Performance budget

Target:
- desktop: 60fps
- mobile: 45–60fps
- first viewport JS should remain conservative
- lazy load the 3D scene
- pause or reduce particles when tab is hidden
- honor `prefers-reduced-motion`
- use dpr clamp `[1, 1.8]`
- keep decorative textures SVG/WebP rather than huge PNGs

## 8. Visual rules

- Dark space is a feature. Do not fill every surface with widgets.
- Cyan = perception / active intelligence.
- Violet = cognition / memory.
- Gold = exceptional/high-value state, never default decoration.
- Red only for intervention/warning.
- 3D should explain system state, not decorate every card.
- Hands-free is primary; pointer/touch remain full fallbacks.
- All state must remain accessible without animation.

## 9. Files that are final P0 assets

- `public/assets/brand/*`
- `public/assets/icons/*` (32 icons)
- `public/assets/agents/*` (6 agent identity cards)
- `public/assets/devices/*` (6 device renders)
- `public/assets/textures/*` (6 procedural textures)
- `public/assets/particles/*`
- `public/assets/audio/ui/*` (8 synthesized UI cues)
- `components/jarvis-core/*`
- `components/voice/*`
- `components/cursor/*`
- `components/memory/*`
- `components/agents/*`
- `components/cinematic/*`

## 10. Assets intentionally NOT faked in this pack

These require dedicated cinematic generation or 3D production:
- final photorealistic hero environment
- final 3–5 s intro movie
- advanced humanoid 3D avatar
- final branded sonic identity / music

Use `docs/CINEMATIC_ASSET_BRIEFS.md` to produce these later.

## 11. Claude Code execution order

1. Copy P0 files.
2. Install dependencies.
3. Make the demo page compile.
4. Fix only integration/path issues; preserve the visual design.
5. Verify desktop + mobile.
6. Add the state store.
7. Connect voice adapter.
8. Connect memory data.
9. Connect agent status data.
10. Add real actions only behind the permission gateway.
11. Run Lighthouse/performance pass.
12. Do not add more panels unless a user task requires them.
