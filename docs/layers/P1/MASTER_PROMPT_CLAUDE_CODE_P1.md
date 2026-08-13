# MASTER PROMPT — JARVIS X2 P1 CINEMATIC

Integrate the supplied P1 pack on top of the JARVIS X2 P0 Visual Foundation.

## Goal
Deliver a contemporary, award-level cinematic product entry that remains fast, useful and free to run.

The aesthetic must NOT become:
- a Marvel/Iron-Man replica
- a wall of sci-fi HUD widgets
- a generic cyberpunk game menu
- a particle demo with no product narrative

The target is:
**contemporary digital product × installation art × ambient intelligence × high-end motion design.**

## Architecture
Use:
- code-rendered intro instead of mandatory video
- one interactive Core motif
- temporal Memory World
- connected Physical World
- scroll-controlled camera/presence
- minimal typography
- strong negative space

## Required routes
`/` — cinematic experience
`/app` — usable product
`/lab/core` — Core state lab
`/lab/cinematic` — full scroll diagnostics

## Sequence
1. Boot
2. Presence
3. Memory
4. Perception
5. Action
6. Physical World
7. Product handoff

## Build tasks
1. Merge P1 files.
2. Make `CinematicExperience` compile.
3. Dynamic import heavy WebGL worlds.
4. Wire intro completion to session storage so repeat visitors can optionally skip it.
5. Add a visible "Skip intro" control.
6. Create WebGL capability detection.
7. Use fallback posters if unavailable.
8. Implement viewport pausing for offscreen canvases.
9. Create one mobile cinematic layout, not a squeezed desktop page.
10. Preserve reduced-motion.
11. No autoplay sound.
12. Ensure `/app` loads independently if the cinematic layer fails.

## Quality target
- visual first meaningful paint quickly
- stable layout before 3D hydration
- desktop 60fps target
- mobile 45–60fps target
- no scroll hijacking
- native scroll always remains possible
- no animation that blocks navigation
- no interaction available only by cursor hover

## Copy direction
Keep copy concise:
- Presence, not interface.
- One intelligence. Every context.
- Memory with history.
- Intent becomes verified action.
- Digital intelligence, physical reach.

Do not add long marketing paragraphs into the cinematic viewport.

## Security
The cinematic UI is presentation only.
Never allow scroll/voice animation events to trigger real external actions.

## Definition of done
- landing works with JavaScript/WebGL degraded
- intro can be skipped
- P0 and P1 visual systems share tokens
- no legacy branding
- no console errors
- no hydration errors
- motion reduced mode is clean
- product handoff works
- mobile receives an intentionally designed composition
