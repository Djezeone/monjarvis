# MASTER PROMPT — JARVIS X2 P0 VISUAL FOUNDATION

You are integrating the supplied `JARVIS_X2_P0_VISUAL_FOUNDATION` pack into an existing or new Next.js application.

## Mission
Deliver a production-quality, contemporary, cinematic **hands-free-first** JARVIS X2 interface.
Do not turn it into a dense sci-fi HUD. Maintain spatial calm, large typography, dark negative space and contextual disclosure.

## Non-negotiables
1. No legacy branding or legacy identity marks.
2. Keep the product name `JARVIS X2`.
3. Preserve accessibility, pointer/touch fallback and `prefers-reduced-motion`.
4. The AI Core is state-driven and must not depend directly on any specific backend.
5. Use the supplied state machine exactly:
   `idle | wake | listening | understanding | thinking | acting | speaking | warning`.
6. Do not fake working AI features. Mark integrations as demo until connected.
7. Do not expose credentials to the browser or LLM.
8. All high-impact external actions require a permission/policy gate.
9. Keep the 3D hero lazy-loaded and performance budgeted.
10. Do not replace SVG assets with emoji or generic icon libraries unless a supplied icon is missing.

## Build order
### Phase A — Compile
- Copy folders according to `CLAUDE_CODE_INTEGRATION.md`.
- Merge dependencies and GLSL loader.
- Make `JarvisP0DemoPage` compile.
- Resolve only actual compatibility/path problems.
- Verify no hydration errors.

### Phase B — UX
Create routes:
- `/` → `CinematicLanding`
- `/app` → `JarvisDashboard`
- `/lab/core` → state test page

Add a minimal navigation transition between landing and product.
Preserve the hands-free dock at the bottom of the product.

### Phase C — State adapter
Create:
`lib/jarvis-ui-store.ts`
with:
- current `JarvisState`
- transcript
- wake phrase
- runtime connection status
- local/cloud mode
- active agent count
- pending approval count

Use a small state library already present in the project; otherwise React context is sufficient.

### Phase D — Voice adapter
Create an interface only; do not assume a provider:
```ts
interface VoiceAdapter {
  state: JarvisState;
  transcript?: string;
  enable(): Promise<void>;
  disable(): Promise<void>;
  mute(): void;
}
```
Then create adapters later for LiveKit / local STT.

### Phase E — Data adapters
Create typed adapters for:
- memory graph
- agent statuses
- active tasks
- connected devices
- environment/home state

The visual components must render demo data when adapters are absent.

### Phase F — Policy UI
Create a reusable `ActionApproval` surface for CRITICAL actions:
- target action
- reason
- data affected
- reversible? yes/no
- approve once
- deny
Never approve critical actions automatically.

### Phase G — Quality
- desktop and mobile visual test
- keyboard navigation
- screen-reader labels for primary controls
- reduced motion
- no autoplay audio
- no microphone before permission
- no pointer-only functionality
- Lighthouse pass
- WebGL failure fallback

## Design guardrails
- Default surface: near-black mineral.
- Cyan = perception / active intelligence.
- Violet = cognition / memory.
- Gold = exceptional value / confirmation, used sparingly.
- Red = intervention only.
- Avoid permanent borders on every element; use depth and spacing.
- Avoid tiny dense dashboard text.
- Prefer one primary action per viewport.
- The product should feel like an ambient operating system, not a control-panel wallpaper.

## Definition of Done
- Landing feels cinematic but loads progressively.
- Product is usable without 3D, voice, or pointer effects.
- Core state visibly changes across all 8 states.
- Hands-free dock can simulate state changes.
- Memory and agents have real typed data interfaces.
- No fake backend claims.
- No legacy-brand remnants.
- No console errors on core routes.
- README documents what is demo vs connected.
