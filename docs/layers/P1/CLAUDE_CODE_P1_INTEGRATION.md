# JARVIS X2 — P1 Cinematic Integration

This pack extends the P0 Visual Foundation. It is intentionally code-first to keep the cinematic experience free, interactive and maintainable.

## Required P0
Install/copy the P0 pack first.

## Add P1
Copy:
```text
components/cinematic/
components/worlds/
components/transitions/
components/audio/
shaders/
config/
public/assets/fallback/
public/assets/audio/cinematic/
```

Import:
```tsx
import "@/components/cinematic/cinematic.css";
```

Route `/`:
```tsx
import { CinematicExperience } from "@/components/cinematic/CinematicExperience";
export default function Page(){ return <CinematicExperience/>; }
```

## Why the intro is not a mandatory MP4
The intro is generated in the browser:
- no video hosting cost
- instant visual continuity with the interactive Core
- responsive composition
- can react to user state later
- honors `prefers-reduced-motion`
- easier to iterate with Claude Code

A prerendered 3–5 second film remains optional for high-end campaign use.

## Performance
Lazy-load `MemoryWorld3D` and `PhysicalWorld3D`.
For production:
- use `dynamic(..., { ssr:false })` for heavy Canvas components
- pause Canvas rendering when chapters are out of viewport
- reduce particle/node count on mobile
- disable OrbitControls for final narrative mode if not needed
- use fallback posters when WebGL is unavailable

## Scroll logic
The current `ScrollDirector` establishes:
- hero opacity
- Core scale
- memory chapter mix
- physical chapter mix

Do not put business logic in the scroll director.
The scroll layer only controls presentation.

## Audio
Three procedural audio beds are included:
- `boot-bed.wav`
- `memory-bed.wav`
- `physical-bed.wav`

They are placeholders for interaction testing, not the final sonic identity.
Never autoplay sound before user interaction.

## Product handoff
The cinematic experience must end in a stable `/app` route.
Avoid a full page reload if the app shell uses Next.js navigation.

## Accessibility
- Intro must be skippable.
- All content remains readable without motion.
- No essential information in 3D alone.
- Provide 2D fallbacks.
- Never require cursor motion or voice input.
